#!/usr/bin/env node

import fetch from "node-fetch";
import {
  getCreneauxAutoReservation,
  disconnectDatabase,
} from "./utils/database.js";
import { processCodeCarte, validateCodeCarte } from "./utils/codeConverter.js";

// --- CONFIGURATION ---
const SUAPS_BASE_URL = process.env.SUAPS_BASE_URL || "https://u-sport.univ-nantes.fr";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const HEURE_CIBLE_FR = 20; // Heure à laquelle le script doit avoir TERMINÉ (heure française)
const MINUTE_CIBLE_FR = 0;  // Minute à laquelle le script doit avoir TERMINÉ

// --- LOGS DÉTAILLÉS ---
const performanceLogs = [];
function logPerf(etape, debut = null) {
  const now = performance.now();
  const timestamp = new Date().toISOString();
  const timeInMs = new Date().getTime();
  const precise = `${timestamp.split('.')[0]}.${String(timeInMs).slice(-3)}`;
  
  if (debut !== null) {
    const duree = (now - debut).toFixed(2);
    const msg = `[${precise}] ✅ ${etape} (${duree}ms)`;
    console.log(msg);
    performanceLogs.push(msg);
    return duree;
  } else {
    const msg = `[${precise}] 🔵 ${etape}`;
    console.log(msg);
    performanceLogs.push(msg);
    return now;
  }
}

// --- UTILITAIRES ---
async function envoyerNotificationDiscord(titre, description, couleur = 0x3498db) {
  if (!DISCORD_WEBHOOK_URL) return;
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [{ title: titre, description, color: couleur, timestamp: new Date() }] }),
    });
  } catch (e) { console.error("Discord error:", e.message); }
}

/**
 * Calcule le délai nécessaire pour que le script se termine à l'heure cible
 * Estimation: le script prend environ 2-5 secondes pour s'exécuter
 * On démarre donc quelques secondes AVANT l'heure cible
 */
function calculerDelaiJusquaDemarrage(tempsEstimeExecution = 3000) {
  const now = new Date();
  const target = new Date();
  
  // Convertir l'heure française (UTC+2 en été, UTC+1 en hiver) en UTC
  const offsetMinutes = now.getTimezoneOffset();
  target.setHours(HEURE_CIBLE_FR, MINUTE_CIBLE_FR, 0, 0);
  
  // Soustraire le temps estimé d'exécution pour finir pile à l'heure cible
  const targetDemarrage = new Date(target.getTime() - tempsEstimeExecution);
  
  let delta = targetDemarrage - now;
  
  // Si on est déjà passé l'heure, démarrer immédiatement
  if (delta < 0) delta = 0;
  
  const heureLocale = target.toLocaleString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  });
  
  console.log(`📍 Heure cible de FIN: ${heureLocale}`);
  console.log(`📍 Temps estimé d'exécution: ${tempsEstimeExecution}ms`);
  console.log(`📍 Heure de démarrage prévue: ${targetDemarrage.toLocaleString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  })}`);
  
  return delta;
}

// --- LOGIN SUAPS (préconnecté pour rapidité) ---
let sessionCookies = null;
async function loginSuaps(codeCarte) {
  const debut = logPerf(`Début login pour carte ${codeCarte.substring(0, 6)}...`);
  
  const validation = validateCodeCarte(codeCarte);
  if (!validation.isValid) throw new Error(validation.message);
  const code = processCodeCarte(codeCarte);

  // Login SUAPS
  const res = await fetch(`${SUAPS_BASE_URL}/api/extended/cartes/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codeCarte: code }),
  });
  if (!res.ok) throw new Error("Login SUAPS failed");
  sessionCookies = res.headers.get("set-cookie"); // sauvegarde pour réutilisation
  
  logPerf(`Login réussi pour carte ${codeCarte.substring(0, 6)}...`, debut);
  return code;
}

// --- CALCUL DES DATES D'OCCURRENCE ---
async function calculerDatesOccurrence(jour, horaireDebut, horaireFin, creneau) {
  // Fonction simplifiée - adapter selon votre logique métier
  const now = new Date();
  const debut = new Date(now);
  const fin = new Date(now);
  
  // Parse les horaires (format attendu: "HH:MM")
  if (horaireDebut) {
    const [h, m] = horaireDebut.split(':');
    debut.setHours(parseInt(h), parseInt(m), 0, 0);
  }
  if (horaireFin) {
    const [h, m] = horaireFin.split(':');
    fin.setHours(parseInt(h), parseInt(m), 0, 0);
  }
  
  return { 
    debut: debut.toISOString(), 
    fin: fin.toISOString() 
  };
}

// --- RÉSERVATION D'UN CRÉNEAU ---
async function reserverCreneau(creneau, userData) {
  const debutResa = logPerf(`Réservation ${creneau.activiteNom}`);
  
  const { debut, fin } = await calculerDatesOccurrence(creneau.jour, creneau.horaireDebut, creneau.horaireFin, creneau);

  const reservationData = {
    actif: false,
    creneau: { ...creneau, occurenceCreneauDTO: { debut, fin, periode: { id: process.env.SUAPS_PERIODE_ID } } },
    dateReservation: new Date().toISOString(),
    individuDTO: { ...userData, tagHexa: processCodeCarte(creneau.codeCarte) },
  };

  const res = await fetch(`${SUAPS_BASE_URL}/api/extended/reservation-creneaux?idPeriode=${process.env.SUAPS_PERIODE_ID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": sessionCookies,
    },
    body: JSON.stringify(reservationData),
  });

  if (!res.ok) {
    const txt = await res.text();
    logPerf(`❌ Réservation ${creneau.activiteNom} échouée`, debutResa);
    throw new Error(`Réservation échouée: ${txt}`);
  }

  const result = await res.json();
  logPerf(`Réservation ${creneau.activiteNom} terminée`, debutResa);
  return result;
}

// --- TRAITEMENT DES CRÉNEAUX ---
async function traiterTousLesCreneaux() {
  const debutTraitement = logPerf("DÉBUT TRAITEMENT DE TOUS LES CRÉNEAUX");
  const logs = [];
  
  const debutRecupCreneaux = logPerf("Récupération des créneaux depuis la DB");
  const creneaux = await getCreneauxAutoReservation();
  logPerf(`${creneaux.length} créneau(x) récupéré(s)`, debutRecupCreneaux);
  
  if (!creneaux.length) {
    logPerf("Aucun créneau à traiter");
    return logs;
  }

  // Pré-login pour tous les users pour gagner du temps
  const debutLogins = logPerf("Phase de pré-login pour tous les utilisateurs");
  for (const c of creneaux) {
    c.userData = await loginSuaps(c.codeCarte);
  }
  logPerf("Tous les logins terminés", debutLogins);

  // Réservations en parallèle
  const debutReservations = logPerf("Phase de réservations en parallèle");
  const results = await Promise.allSettled(
    creneaux.map(c => reserverCreneau(c, c.userData).then(() => `${c.activiteNom} réussi`).catch(e => `${c.activiteNom} failed: ${e.message}`))
  );
  logPerf("Toutes les réservations terminées", debutReservations);

  results.forEach(r => logs.push(r.status === "fulfilled" ? r.value : r.reason));

  logPerf("FIN TRAITEMENT DE TOUS LES CRÉNEAUX", debutTraitement);
  return logs;
}

// --- MAIN ---
(async () => {
  const debutScript = performance.now();
  const heureDebutScript = new Date();
  
  console.log("═".repeat(80));
  console.log("🚀 DÉMARRAGE DU SCRIPT AUTO-RESERVATION");
  console.log("═".repeat(80));
  logPerf("INITIALISATION DU SCRIPT");
  
  try {
    const debutNotif = logPerf("Envoi notification Discord démarrage");
    await envoyerNotificationDiscord("🚀 Auto-reservation démarrage", "Préparation...");
    logPerf("Notification envoyée", debutNotif);

    const delai = calculerDelaiJusquaDemarrage();
    
    if (delai > 0) {
      console.log(`⏰ Attente de ${delai}ms (${(delai/1000).toFixed(2)}s) jusqu'au démarrage optimal...`);
      await new Promise(r => setTimeout(r, delai));
      logPerf("FIN D'ATTENTE - DÉMARRAGE DES RÉSERVATIONS");
    } else {
      logPerf("⚡ Démarrage immédiat (heure cible dépassée)");
    }

    const logs = await traiterTousLesCreneaux();

    const debutNotifFin = logPerf("Envoi notification Discord fin");
    await envoyerNotificationDiscord("🏁 Auto-reservation terminée", logs.join("\n"), 0x27ae60);
    logPerf("Notification fin envoyée", debutNotifFin);
    
    const heureFinScript = new Date();
    const dureeTotal = ((performance.now() - debutScript) / 1000).toFixed(3);
    
    console.log("═".repeat(80));
    console.log("✅ SCRIPT TERMINÉ AVEC SUCCÈS");
    console.log(`⏱️  Heure de début: ${heureDebutScript.toLocaleString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    })}`);
    console.log(`⏱️  Heure de fin: ${heureFinScript.toLocaleString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    })}`);
    console.log(`⏱️  Durée totale d'exécution: ${dureeTotal}s`);
    console.log("═".repeat(80));
    console.log("\n📊 RÉSUMÉ DES OPÉRATIONS:");
    logs.forEach((log, i) => console.log(`  ${i + 1}. ${log}`));
    console.log("\n📝 LOGS DE PERFORMANCE:");
    performanceLogs.forEach(log => console.log(`  ${log}`));
    console.log("═".repeat(80));
    
  } catch (e) {
    const heureErreur = new Date();
    console.error("═".repeat(80));
    console.error("💥 ERREUR CRITIQUE");
    console.error("═".repeat(80));
    console.error(`⏱️  Heure de l'erreur: ${heureErreur.toLocaleString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    })}`);
    console.error("Erreur:", e);
    console.error("Stack:", e.stack);
    console.error("═".repeat(80));
    
    await envoyerNotificationDiscord("💥 Auto-reservation Erreur", e.message, 0xe74c3c);
  } finally {
    const debutDisconnect = logPerf("Déconnexion de la base de données");
    await disconnectDatabase();
    logPerf("Déconnexion terminée", debutDisconnect);
  }
})();

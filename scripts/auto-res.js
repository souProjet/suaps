#!/usr/bin/env node
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

import fetch from "node-fetch";
import {
  getCreneauxAutoReservation,
  disconnectDatabase,
  enregistrerLogReservation,
  mettreAJourCreneauAutoReservation,
} from "./utils/database.js";
import { processCodeCarte, validateCodeCarte } from "./utils/codeConverter.js";

// --- CONFIGURATION ---
const SUAPS_BASE_URL = process.env.SUAPS_BASE_URL || "https://u-sport.univ-nantes.fr";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const HEURE_CIBLE_FR = 20; // Heure à laquelle le script doit avoir TERMINÉ (heure française)
const MINUTE_CIBLE_FR = 0;  // Minute à laquelle le script doit avoir TERMINÉ

// Diagnostic des variables d'environnement
console.log('=== DIAGNOSTIC VARIABLES D\'ENVIRONNEMENT ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'DÉFINIE' : 'NON DÉFINIE');
console.log('SUAPS_PERIODE_ID:', process.env.SUAPS_PERIODE_ID ? 'DÉFINIE' : 'NON DÉFINIE');
console.log('DISCORD_WEBHOOK_URL:', process.env.DISCORD_WEBHOOK_URL ? 'DÉFINIE' : 'NON DÉFINIE');
console.log('===============================================');

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
 * Calcule le délai pour démarrer EXACTEMENT à l'heure cible française
 * Pas de soustraction de temps d'exécution - on démarre pile à l'heure
 */
function calculerDelaiJusquaDemarrage() {
  const maintenant = new Date();
  
  // Créer la date cible en heure française (Europe/Paris)
  const targetFrench = new Date().toLocaleString("en-CA", {timeZone: "Europe/Paris"});
  const [datePart, timePart] = targetFrench.split(', ');
  
  // Construire la date cible pour aujourd'hui
  const target = new Date();
  target.setHours(HEURE_CIBLE_FR, MINUTE_CIBLE_FR, 0, 0);
  
  // Convertir en temps français réel
  const targetUTC = new Date(target.getTime() - (target.getTimezoneOffset() * 60000));
  const parisOffset = targetUTC.getTimezoneOffset() + 60; // Paris = UTC+1 (hiver) ou UTC+2 (été)
  const targetParis = new Date(targetUTC.getTime() - (parisOffset * 60000));
  
  // Si l'heure est déjà passée aujourd'hui, programmer pour demain
  if (targetParis <= maintenant) {
    targetParis.setDate(targetParis.getDate() + 1);
  }
  
  const delta = targetParis - maintenant;
  
  // Logging détaillé
  console.log(`📍 Heure actuelle: ${maintenant.toLocaleString('fr-FR', { 
    timeZone: 'Europe/Paris',
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  })} (Paris)`);
  
  console.log(`📍 Heure cible: ${HEURE_CIBLE_FR}h${MINUTE_CIBLE_FR.toString().padStart(2, '0')} (Paris)`);
  
  console.log(`📍 Démarrage dans: ${Math.round(delta/1000)}s (${Math.round(delta/60000)}min)`);
  
  // Vérification de sécurité : si le délai est négatif ou trop court, forcer un délai minimum
  if (delta < 1000) { // Moins d'1 seconde
    console.log(`⚠️  Délai trop court (${delta}ms), forçage à 1000ms`);
    return 1000;
  }
  
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
  
  try {
    const { debut, fin } = await calculerDatesOccurrence(creneau.jour, creneau.horaireDebut, creneau.horaireFin, creneau);

    // Structure simplifiée basée sur les données de la base
    const reservationData = {
      actif: false,
      creneau: {
        actif: true,
        activite: {
          id: creneau.activiteId,
          nom: creneau.activiteNom,
          typePrestation: "ACTIVITE",
          inscriptionAnnuelle: true
        },
        id: creneau.creneauId,
        jour: creneau.jour,
        horaireDebut: creneau.horaireDebut,
        horaireFin: creneau.horaireFin,
        quota: creneau.quota || creneau.quotaLoisir || 24,
        occurenceCreneauDTO: {
          debut: debut.replace(".000Z", "Z"),
          fin: fin.replace(".000Z", "Z"),
          periode: {
            id: process.env.SUAPS_PERIODE_ID || "4dc2c931-12c4-4cac-8709-c9bbb2513e16"
          }
        }
      },
      dateReservation: new Date().toISOString(),
      forcage: false,
      individuDTO: {
        nom: userData.nom || "AUTO_RESERVATION",
        prenom: userData.prenom || "USER",
        code: creneau.userId,
        numero: creneau.userId,
        tagHexa: processCodeCarte(creneau.codeCarte),
        type: userData.type || "EXTERNE",
        typeExterne: userData.typeExterne || "ETUDIANT",
        email: userData.email || "",
        telephone: userData.telephone || "",
        paiementEffectue: true,
        estInscrit: true
      },
      utilisateur: {
        login: creneau.userId,
        typeUtilisateur: userData.typeUtilisateur || "EXTERNE"
      }
    };

    const res = await fetch(`${SUAPS_BASE_URL}/api/extended/reservation-creneaux?idPeriode=${process.env.SUAPS_PERIODE_ID}`, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
        "Content-Type": "application/json",
        "Cookie": sessionCookies,
        "Origin": "https://u-sport.univ-nantes.fr",
        "Referer": "https://u-sport.univ-nantes.fr/activites",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
      },
      credentials: "include",
      mode: "cors",
      body: JSON.stringify(reservationData),
    });

    if (!res.ok) {
      const txt = await res.text();
      logPerf(`❌ Réservation ${creneau.activiteNom} échouée`, debutResa);
      
      // Déterminer le type d'erreur
      let statut = "FAILED";
      if (txt.includes("quota") || txt.includes("complet")) {
        statut = "QUOTA_FULL";
      } else if (txt.includes("réseau") || txt.includes("network")) {
        statut = "NETWORK_ERROR";
      }
      
      // Mettre à jour les statistiques du créneau
      await mettreAJourCreneauAutoReservation(creneau.id, {
        derniereTentative: new Date().toISOString(),
        nbTentatives: creneau.nbTentatives + 1,
      });
      
      // Enregistrer le log d'erreur
      await enregistrerLogReservation({
        userId: creneau.userId,
        creneauAutoId: creneau.id,
        timestamp: new Date().toISOString(),
        statut,
        message: `Réservation échouée: ${txt}`,
        details: { error: txt, statusCode: res.status },
      });
      
      throw new Error(`Réservation échouée: ${txt}`);
    }

    const result = await res.json();
    logPerf(`Réservation ${creneau.activiteNom} terminée`, debutResa);
    
    // Mettre à jour les statistiques du créneau en cas de succès
    await mettreAJourCreneauAutoReservation(creneau.id, {
      derniereTentative: new Date().toISOString(),
      derniereReservation: new Date().toISOString(),
      nbTentatives: creneau.nbTentatives + 1,
      nbReussites: creneau.nbReussites + 1,
    });
    
    // Enregistrer le log de succès
    await enregistrerLogReservation({
      userId: creneau.userId,
      creneauAutoId: creneau.id,
      timestamp: new Date().toISOString(),
      statut: "SUCCESS",
      message: "Réservation réussie",
      details: result,
    });
    
    return result;
  } catch (error) {
    // Si l'erreur n'a pas déjà été loggée (erreurs système/réseau)
    if (!error.message.includes("Réservation échouée:")) {
      await mettreAJourCreneauAutoReservation(creneau.id, {
        derniereTentative: new Date().toISOString(),
        nbTentatives: creneau.nbTentatives + 1,
      });
      
      await enregistrerLogReservation({
        userId: creneau.userId,
        creneauAutoId: creneau.id,
        timestamp: new Date().toISOString(),
        statut: "NETWORK_ERROR",
        message: `Erreur système: ${error.message}`,
        details: { error: error.message, stack: error.stack },
      });
    }
    
    throw error;
  }
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
    try {
      c.userData = await loginSuaps(c.codeCarte);
    } catch (error) {
      // Enregistrer l'erreur d'authentification dans la BDD
      await enregistrerLogReservation({
        userId: c.userId,
        creneauAutoId: c.id,
        timestamp: new Date().toISOString(),
        statut: "AUTH_ERROR",
        message: `Erreur d'authentification: ${error.message}`,
        details: { error: error.message },
      });
      
      await mettreAJourCreneauAutoReservation(c.id, {
        derniereTentative: new Date().toISOString(),
        nbTentatives: c.nbTentatives + 1,
      });
      
      logs.push(`${c.activiteNom} failed: Erreur auth - ${error.message}`);
      c.authError = true; // Marquer pour ignorer lors de la réservation
    }
  }
  logPerf("Tous les logins terminés", debutLogins);

  // Réservations en parallèle (uniquement pour les créneaux sans erreur d'auth)
  const debutReservations = logPerf("Phase de réservations en parallèle");
  const creneauxValides = creneaux.filter(c => !c.authError);
  
  const results = await Promise.allSettled(
    creneauxValides.map(c => reserverCreneau(c, c.userData).then(() => `${c.activiteNom} réussi`).catch(e => `${c.activiteNom} failed: ${e.message}`))
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

    // Attendre l'heure exacte avec vérification précise
    console.log("⏰ Attente de l'heure exacte...");
    await new Promise((resolve) => {
      const checkTime = () => {
        const now = new Date();
        const nowParis = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
        const heureActuelle = nowParis.getHours();
        const minuteActuelle = nowParis.getMinutes();
        const secondeActuelle = nowParis.getSeconds();
        
        console.log(`🕐 ${heureActuelle}h${minuteActuelle.toString().padStart(2, '0')}:${secondeActuelle.toString().padStart(2, '0')} (Paris)`);
        
        // Déclencher exactement à l'heure et minute cible
        if (heureActuelle === HEURE_CIBLE_FR && minuteActuelle === MINUTE_CIBLE_FR) {
          console.log("🎯 HEURE EXACTE ATTEINTE - DÉMARRAGE !");
          logPerf("HEURE EXACTE ATTEINTE - DÉMARRAGE DES RÉSERVATIONS");
          resolve();
        } else {
          // Vérifier toutes les secondes
          setTimeout(checkTime, 1000);
        }
      };
      checkTime();
    });

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

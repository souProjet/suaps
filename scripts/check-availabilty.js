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

// --- AUTHENTIFICATION SUAPS ---
let sessionCookies = null;

/**
 * Envoie une notification Discord
 */
async function envoyerNotificationDiscord(titre, description, couleur = 0x3498db, champs = []) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log("⚠️ Webhook Discord non configuré, notification ignorée");
    return;
  }

  try {
    const embed = {
      title: titre,
      description: description,
      color: couleur,
      timestamp: new Date().toISOString(),
      fields: champs,
    };

    const payload = {
      embeds: [embed],
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        "❌ Erreur envoi Discord:",
        response.status,
        response.statusText
      );
    } else {
      console.log("✅ Notification Discord envoyée");
    }
  } catch (error) {
    console.error("❌ Erreur notification Discord:", error.message);
  }
}

/**
 * Effectue la connexion SUAPS avec un code carte
 */
async function loginSuaps(codeCarte) {
  console.log(`🔐 Connexion pour la carte ${codeCarte.substring(0, 6)}...`);
  
  const validation = validateCodeCarte(codeCarte);
  if (!validation.isValid) {
    throw new Error(`Code carte invalide: ${validation.message}`);
  }
  
  const codeCarteProcessed = processCodeCarte(codeCarte);

  const response = await fetch(`${SUAPS_BASE_URL}/api/extended/cartes/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
    },
    body: JSON.stringify({ codeCarte: codeCarteProcessed }),
  });

  if (!response.ok) {
    throw new Error(`Erreur de connexion SUAPS: ${response.status} ${response.statusText}`);
  }

  // Récupérer les cookies de session
  sessionCookies = response.headers.get("set-cookie");
  
  console.log(`✅ Connexion réussie pour la carte ${codeCarte.substring(0, 6)}...`);
  return codeCarteProcessed;
}

/**
 * Récupère les réservations existantes d'un utilisateur
 */
async function getReservationsUtilisateur(userId, accessToken) {
  try {
    console.log(`📋 Récupération des réservations existantes pour l'utilisateur ${userId}...`);
    
    const url = `${SUAPS_BASE_URL}/api/extended/reservation-creneaux?idIndividu=${userId}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
        "Cookie": sessionCookies || `accessToken=${accessToken}`,
      },
    });

    if (!response.ok) {
      console.log(`⚠️  Erreur lors de la récupération des réservations: ${response.status} ${response.statusText}`);
      return [];
    }

    const reservations = await response.json();
    console.log(`✅ ${reservations.length} réservation(s) trouvée(s)`);
    
    return reservations;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des réservations:`, error.message);
    return [];
  }
}

/**
 * Calcule la date réelle du prochain créneau selon la logique des 7 jours glissants
 */
function calculerDateCreneauCible(jour, horaireDebut, horaireFin) {
  const joursMap = {
    'DIMANCHE': 0, 'LUNDI': 1, 'MARDI': 2, 'MERCREDI': 3,
    'JEUDI': 4, 'VENDREDI': 5, 'SAMEDI': 6
  };
  
  const jourCible = joursMap[jour.toUpperCase()];
  const maintenant = new Date();
  const jourActuel = maintenant.getDay();
  
  // Parser l'heure de début et fin du créneau
  const [heureDebut, minuteDebut] = horaireDebut.split(':').map(Number);
  const [heureFin, minuteFin] = horaireFin.split(':').map(Number);
  
  let joursJusquauCible = (jourCible - jourActuel + 7) % 7;
  
  // Si c'est le même jour, vérifier l'heure
  if (joursJusquauCible === 0) {
    const heureFinCreneau = new Date(maintenant);
    heureFinCreneau.setHours(heureFin, minuteFin, 0, 0);
    
    // Si on est avant la fin du créneau, on peut cibler aujourd'hui
    if (maintenant < heureFinCreneau) {
      joursJusquauCible = 0; // Aujourd'hui
    } else {
      // Si on est après la fin du créneau, cibler la semaine suivante
      joursJusquauCible = 7;
    }
  }
  
  const dateCreneauCible = new Date(maintenant);
  dateCreneauCible.setDate(dateCreneauCible.getDate() + joursJusquauCible);
  dateCreneauCible.setHours(heureDebut, minuteDebut, 0, 0);
  
  return dateCreneauCible;
}

/**
 * Vérifie si un créneau correspond à une réservation existante
 * Prend en compte la date réelle du créneau selon la logique des 7 jours glissants
 */
function estDejaInscrit(creneau, reservations) {
  if (!reservations || reservations.length === 0) {
    return false;
  }
  
  // Calculer la date cible du créneau selon la logique métier
  const dateCreneauCible = calculerDateCreneauCible(creneau.jour, creneau.horaireDebut, creneau.horaireFin);
  
  const resultat = reservations.some(reservation => {
    const creneauReserve = reservation.creneau;
    
    // Vérifications de base (activité, jour, horaires)
    if (!creneauReserve) {
      return false;
    }
    
    // Vérifier l'ID du créneau directement (plus fiable)
    if (creneauReserve.id === creneau.creneauId) {
      // Vérifier si la réservation est active
      if (reservation.actif === false || reservation.statut === 'ANNULEE') {
        return false;
      }
      
      // Vérifier la date si disponible
      if (reservation.occurenceCreneauDTO && reservation.occurenceCreneauDTO.debut) {
        const dateReservation = new Date(reservation.occurenceCreneauDTO.debut);
        
        // Comparer les dates (même jour) avec une tolérance de 7 jours
        const diffJours = Math.abs(dateCreneauCible - dateReservation) / (1000 * 60 * 60 * 24);
        if (diffJours < 7) {
          console.log(`   ✓ Réservation existante trouvée pour ${creneau.activiteNom} (date: ${dateReservation.toLocaleDateString('fr-FR')})`);
          return true;
        }
      } else {
        // Pas de date, mais même créneau ID = inscrit
        console.log(`   ✓ Réservation existante trouvée pour ${creneau.activiteNom} (même créneau ID)`);
        return true;
      }
    }
    
    // Vérification alternative par activité + horaires (au cas où)
    if (creneauReserve.activite &&
        creneauReserve.activite.id === creneau.activiteId &&
        creneauReserve.jour === creneau.jour.toUpperCase() &&
        creneauReserve.horaireDebut === creneau.horaireDebut &&
        creneauReserve.horaireFin === creneau.horaireFin) {
      
      if (reservation.actif === false || reservation.statut === 'ANNULEE') {
        return false;
      }
      
      // Vérifier la date réelle si disponible
      if (reservation.occurenceCreneauDTO && reservation.occurenceCreneauDTO.debut) {
        const dateReservation = new Date(reservation.occurenceCreneauDTO.debut);
        
        const diffJours = Math.abs(dateCreneauCible - dateReservation) / (1000 * 60 * 60 * 24);
        if (diffJours < 7) {
          console.log(`   ✓ Réservation existante trouvée pour ${creneau.activiteNom} (date: ${dateReservation.toLocaleDateString('fr-FR')})`);
          return true;
        }
      } else {
        // Pas de date mais tous les critères correspondent
        console.log(`   ✓ Réservation existante trouvée pour ${creneau.activiteNom} (critères correspondants)`);
        return true;
      }
    }
    
    return false;
  });
  
  return resultat;
}

/**
 * Calcule les dates d'occurrence d'un créneau
 */
function calculerDatesOccurrence(jour, horaireDebut, horaireFin) {
  const dateCreneaux = calculerDateCreneauCible(jour, horaireDebut, horaireFin);
  
  // Parser les horaires (format "HH:MM")
  const [heureDebut, minuteDebut] = horaireDebut.split(':').map(Number);
  const [heureFin, minuteFin] = horaireFin.split(':').map(Number);
  
  // Date de début
  const dateDebut = new Date(dateCreneaux);
  dateDebut.setHours(heureDebut, minuteDebut, 0, 0);
  
  // Date de fin
  const dateFin = new Date(dateCreneaux);
  dateFin.setHours(heureFin, minuteFin, 0, 0);
  
  return {
    debut: dateDebut.toISOString(),
    fin: dateFin.toISOString()
  };
}

/**
 * Réserve automatiquement un créneau disponible
 */
async function reserverCreneauAutomatiquement(creneau, accessToken) {
  try {
    console.log(`🎯 Tentative de réservation automatique: ${creneau.activiteNom}`);
    
    const { debut, fin } = calculerDatesOccurrence(creneau.jour, creneau.horaireDebut, creneau.horaireFin);
    
    // Récupérer les données utilisateur via l'API profil
    let userData = {};
    try {
      const profileResponse = await fetch(`${SUAPS_BASE_URL}/api/individus/me`, {
        method: "GET",
        credentials: "include",
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
          "Accept": "application/json, text/plain, */*",
          "Cookie": sessionCookies,
        },
      });
      
      if (profileResponse.ok) {
        userData = await profileResponse.json();
      }
    } catch (err) {
      console.log(`⚠️ Impossible de récupérer le profil utilisateur, utilisation des données de fallback`);
    }
    
    // Structure de réservation
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
    
    const response = await fetch(
      `${SUAPS_BASE_URL}/api/extended/reservation-creneaux?idPeriode=${process.env.SUAPS_PERIODE_ID}`,
      {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
          "Content-Type": "application/json",
          "Cookie": sessionCookies,
          "Origin": SUAPS_BASE_URL,
          "Referer": `${SUAPS_BASE_URL}/activites`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin"
        },
        credentials: "include",
        mode: "cors",
        body: JSON.stringify(reservationData),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Mettre à jour les statistiques en base de données
    await mettreAJourCreneauAutoReservation(creneau.id, {
      derniereTentative: new Date().toISOString(),
      derniereReservation: new Date().toISOString(),
      nbTentatives: (creneau.nbTentatives || 0) + 1,
      nbReussites: (creneau.nbReussites || 0) + 1,
    });
    
    // Enregistrer le log de succès
    await enregistrerLogReservation({
      userId: creneau.userId,
      creneauAutoId: creneau.id,
      timestamp: new Date().toISOString(),
      statut: "SUCCESS",
      message: "Réservation automatique réussie (check-availability)",
      details: result,
    });
    
    console.log(`✅ Réservation réussie pour ${creneau.activiteNom}`);
    return { success: true, result };
    
  } catch (error) {
    console.error(`❌ Erreur lors de la réservation: ${error.message}`);
    
    // Déterminer le type d'erreur
    let statut = "FAILED";
    if (error.message.includes("quota") || error.message.includes("complet")) {
      statut = "QUOTA_FULL";
    } else if (error.message.includes("réseau") || error.message.includes("network")) {
      statut = "NETWORK_ERROR";
    }
    
    // Mettre à jour les statistiques
    await mettreAJourCreneauAutoReservation(creneau.id, {
      derniereTentative: new Date().toISOString(),
      nbTentatives: (creneau.nbTentatives || 0) + 1,
    });
    
    // Enregistrer le log d'erreur
    await enregistrerLogReservation({
      userId: creneau.userId,
      creneauAutoId: creneau.id,
      timestamp: new Date().toISOString(),
      statut,
      message: `Réservation automatique échouée: ${error.message}`,
      details: { error: error.message },
    });
    
    return { success: false, error: error.message };
  }
}

/**
 * Vérifie la disponibilité d'un créneau spécifique
 */
async function verifierDisponibiliteCreneau(creneau, accessToken, reservationsExistantes = []) {
  try {
    // Calculer la date cible pour ce créneau
    const dateCreneauCible = calculerDateCreneauCible(creneau.jour, creneau.horaireDebut, creneau.horaireFin);
    const dateFormatee = dateCreneauCible.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Vérifier d'abord si l'utilisateur est déjà inscrit à ce créneau
    if (estDejaInscrit(creneau, reservationsExistantes)) {
      console.log(`✅ Déjà inscrit: ${creneau.activiteNom} - ${creneau.jour} ${creneau.horaireDebut}-${creneau.horaireFin} (${dateFormatee})`);
      return { 
        available: false, 
        alreadyRegistered: true,
        message: "Déjà inscrit à ce créneau"
      };
    }
    
    console.log(`🔍 Vérification du créneau: ${creneau.activiteNom} - ${creneau.jour} ${creneau.horaireDebut}-${creneau.horaireFin} (${dateFormatee})`);
    
    // Construire l'URL avec les paramètres requis
    const url = `https://u-sport.univ-nantes.fr/api/extended/creneau-recurrents/semaine?idActivite=${creneau.activiteId}&idPeriode=${process.env.SUAPS_PERIODE_ID || '4dc2c931-12c4-4cac-8709-c9bbb2513e16'}&idIndividu=${creneau.userId}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
        "Cookie": sessionCookies || `accessToken=${accessToken}`,
      },
    });

    if (!response.ok) {
      console.log(`❌ Erreur lors de la vérification du créneau ${creneau.activiteNom}: ${response.status} ${response.statusText}`);
      return { available: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    
    // Chercher le créneau correspondant dans la réponse
    if (Array.isArray(data)) {
      for (const creneauAPI of data) {
        // Vérifier si c'est le bon créneau (jour et horaires correspondent)
        if (creneauAPI.jour === creneau.jour.toUpperCase() &&
            creneauAPI.horaireDebut === creneau.horaireDebut &&
            creneauAPI.horaireFin === creneau.horaireFin) {
          
          // Calculer les places disponibles
          const placesTotales = creneauAPI.quota || 0;
          const placesOccupees = creneauAPI.nbInscrits || 0;
          const placesDisponibles = placesTotales - placesOccupees;
          
          const isAvailable = placesDisponibles > 0;
          
          console.log(`📊 ${creneau.activiteNom} - ${creneau.jour} ${creneau.horaireDebut}-${creneau.horaireFin}:`);
          console.log(`   Places: ${placesOccupees}/${placesTotales} (${placesDisponibles} disponibles)`);
          
          // Si une place est disponible, tenter la réservation automatique
          if (isAvailable) {
            const dateFormatee = calculerDateCreneauCible(creneau.jour, creneau.horaireDebut, creneau.horaireFin)
              .toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });

            console.log(`🎯 Place disponible ! Tentative de réservation automatique...`);
            
            // Tenter la réservation automatique
            const reservationResult = await reserverCreneauAutomatiquement(creneau, accessToken);
            
            if (reservationResult.success) {
              // Notification de succès
              await envoyerNotificationDiscord(
                "🎉 Réservation automatique réussie !",
                `Le créneau a été réservé automatiquement avec succès :`,
                0x00ff00, // Vert vif
                [
                  {
                    name: "🏃 Activité",
                    value: creneau.activiteNom,
                    inline: true
                  },
                  {
                    name: "📅 Jour",
                    value: `${creneau.jour} ${creneau.horaireDebut}-${creneau.horaireFin}`,
                    inline: true
                  },
                  {
                    name: "📍 Date cible",
                    value: dateFormatee,
                    inline: false
                  },
                  {
                    name: "✅ Statut",
                    value: "Réservation confirmée",
                    inline: true
                  },
                  {
                    name: "👤 Utilisateur",
                    value: creneau.userId || "Non défini",
                    inline: true
                  }
                ]
              );
            } else {
              // Notification d'échec (place disponible mais réservation échouée)
              await envoyerNotificationDiscord(
                "⚠️ Place disponible mais réservation échouée",
                `Une place est disponible mais la réservation automatique a échoué :`,
                0xff9900, // Orange
                [
                  {
                    name: "🏃 Activité",
                    value: creneau.activiteNom,
                    inline: true
                  },
                  {
                    name: "📅 Jour",
                    value: `${creneau.jour} ${creneau.horaireDebut}-${creneau.horaireFin}`,
                    inline: true
                  },
                  {
                    name: "📍 Date cible",
                    value: dateFormatee,
                    inline: false
                  },
                  {
                    name: "📊 Places",
                    value: `${placesDisponibles} disponible(s) sur ${placesTotales}`,
                    inline: true
                  },
                  {
                    name: "❌ Erreur",
                    value: reservationResult.error || "Erreur inconnue",
                    inline: false
                  },
                  {
                    name: "👤 Utilisateur",
                    value: creneau.userId || "Non défini",
                    inline: true
                  }
                ]
              );
            }
          }
          
          return {
            available: isAvailable,
            placesTotales,
            placesOccupees,
            placesDisponibles,
            fileAttente: creneauAPI.fileAttente || false
          };
        }
      }
      
      console.log(`⚠️  Créneau non trouvé dans la réponse API pour ${creneau.activiteNom}`);
      return { available: false, error: "Créneau non trouvé dans la réponse" };
    }
    
    console.log(`⚠️  Format de réponse inattendu pour ${creneau.activiteNom}`);
    return { available: false, error: "Format de réponse inattendu" };
    
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification du créneau ${creneau.activiteNom}:`, error.message);
    return { available: false, error: error.message };
  }
}

/**
 * Vérifie la disponibilité de tous les créneaux pour un utilisateur
 */
async function verifierTousLesCreneaux() {
  console.log("🚀 Démarrage de la vérification de disponibilité des créneaux");
  
  try {
    // Récupérer tous les créneaux configurés
    const creneaux = await getCreneauxAutoReservation();
    console.log(`📋 ${creneaux.length} créneaux trouvés dans la base de données`);
    
    if (creneaux.length === 0) {
      console.log("ℹ️  Aucun créneau configuré pour l'auto-réservation");
      return;
    }
    
    // Grouper les créneaux par utilisateur pour optimiser les connexions
    const creneauxParUtilisateur = new Map();
    creneaux.forEach(creneau => {
      if (!creneauxParUtilisateur.has(creneau.userId)) {
        creneauxParUtilisateur.set(creneau.userId, []);
      }
      creneauxParUtilisateur.get(creneau.userId).push(creneau);
    });
    
    console.log(`👥 ${creneauxParUtilisateur.size} utilisateur(s) unique(s) trouvé(s)`);
    
    // Traiter chaque utilisateur
    for (const [userId, creneauxUtilisateur] of creneauxParUtilisateur) {
      console.log(`\n🔄 Traitement des créneaux pour l'utilisateur ${userId}:`);
      
        try {
        // Se connecter avec le code carte du premier créneau (tous les créneaux d'un utilisateur ont le même code carte)
        const premierCreneau = creneauxUtilisateur[0];
        const accessToken = await loginSuaps(premierCreneau.codeCarte);
        
        // Récupérer les réservations existantes de l'utilisateur
        const reservationsExistantes = await getReservationsUtilisateur(userId, accessToken);
        
        // Vérifier chaque créneau de cet utilisateur
        let placesDisponiblesTrouvees = false;
        let creneauxDejaInscrits = 0;
        
        for (const creneau of creneauxUtilisateur) {
          const resultat = await verifierDisponibiliteCreneau(creneau, accessToken, reservationsExistantes);
          
          if (resultat.alreadyRegistered) {
            creneauxDejaInscrits++;
          } else if (resultat.available) {
            placesDisponiblesTrouvees = true;
            console.log(`🎉 PLACES DISPONIBLES! ${creneau.activiteNom} - ${creneau.jour} ${creneau.horaireDebut}-${creneau.horaireFin} (${resultat.placesDisponibles} places libres)`);
          }
          
          // Petite pause entre les requêtes pour éviter de surcharger l'API
          await new Promise(resolve => setTimeout(resolve, 500));
        }        if (creneauxDejaInscrits > 0) {
          console.log(`ℹ️  ${creneauxDejaInscrits} créneau(x) déjà inscrit(s) pour l'utilisateur ${userId}`);
        }
        
        if (!placesDisponiblesTrouvees && creneauxDejaInscrits === 0) {
          console.log(`😔 Aucune place disponible pour l'utilisateur ${userId}`);
        } else if (!placesDisponiblesTrouvees && creneauxDejaInscrits > 0) {
          console.log(`ℹ️  Tous les créneaux configurés sont soit complets soit déjà réservés pour l'utilisateur ${userId}`);
        }
        
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de l'utilisateur ${userId}:`, error.message);
      }
      
      // Pause entre les utilisateurs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error("❌ Erreur lors de la vérification des créneaux:", error);
  }
}

/**
 * Fonction principale
 */
async function main() {
  const startTime = new Date();
  console.log(`⏰ Début de la vérification à ${startTime.toLocaleTimeString("fr-FR")}`);
  
  // Test initial - vérifier si on peut accéder aux modules
  console.log("🔧 Test des imports et de la configuration...");
  console.log(`📍 SUAPS_BASE_URL: ${SUAPS_BASE_URL}`);
  console.log(`📍 SUAPS_PERIODE_ID: ${process.env.SUAPS_PERIODE_ID || 'NON DÉFINI'}`);
  
  try {
    await verifierTousLesCreneaux();
  } catch (error) {
    console.error("💥 Erreur fatale:", error);
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  } finally {
    // Fermer la connexion à la base de données
    try {
      await disconnectDatabase();
    } catch (error) {
      console.error("⚠️  Erreur lors de la fermeture de la base de données:", error.message);
    }
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(`\n✅ Vérification terminée en ${duration}ms à ${endTime.toLocaleTimeString("fr-FR")}`);
  }
}

// Exécuter le script si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { verifierTousLesCreneaux, verifierDisponibiliteCreneau, getReservationsUtilisateur, estDejaInscrit };

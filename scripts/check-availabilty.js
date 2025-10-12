#!/usr/bin/env node

import fetch from "node-fetch";
import {
  getCreneauxAutoReservation,
  disconnectDatabase,
} from "./utils/database.js";
import { processCodeCarte, validateCodeCarte } from "./utils/codeConverter.js";

// --- CONFIGURATION ---
const SUAPS_BASE_URL = process.env.SUAPS_BASE_URL || "https://u-sport.univ-nantes.fr";

// --- AUTHENTIFICATION SUAPS ---
let sessionCookies = null;

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
 * Vérifie la disponibilité d'un créneau spécifique
 */
async function verifierDisponibiliteCreneau(creneau, accessToken) {
  try {
    console.log(`🔍 Vérification du créneau: ${creneau.activiteNom} - ${creneau.jour} ${creneau.horaireDebut}-${creneau.horaireFin}`);
    
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
        
        // Vérifier chaque créneau de cet utilisateur
        let placesDisponiblesTrouvees = false;
        
        for (const creneau of creneauxUtilisateur) {
          const resultat = await verifierDisponibiliteCreneau(creneau, accessToken);
          
          if (resultat.available) {
            placesDisponiblesTrouvees = true;
            console.log(`🎉 PLACES DISPONIBLES! ${creneau.activiteNom} - ${creneau.jour} ${creneau.horaireDebut}-${creneau.horaireFin} (${resultat.placesDisponibles} places libres)`);
          }
          
          // Petite pause entre les requêtes pour éviter de surcharger l'API
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (!placesDisponiblesTrouvees) {
          console.log(`😔 Aucune place disponible pour l'utilisateur ${userId}`);
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

export { verifierTousLesCreneaux, verifierDisponibiliteCreneau };

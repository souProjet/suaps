import { NextRequest, NextResponse } from "next/server";
import {
  getCreneauxAutoReservation,
  disconnectDatabase,
  enregistrerLogReservation,
  mettreAJourCreneauAutoReservation,
} from "@/utils/database";
import { processCodeCarte, validateCodeCarte } from "@/utils/codeConverter";
import { getCurrentUserFromRequest } from "@/utils/auth";

// Configuration du timeout Vercel
export const maxDuration = 300; // 5 minutes

// Configuration
const SUAPS_BASE_URL = process.env.SUAPS_BASE_URL || "https://u-sport.univ-nantes.fr";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Headers pour les requêtes SUAPS
const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
  "Content-Type": "application/json",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Pragma": "no-cache",
  "Cache-Control": "no-cache",
};

/**
 * Interface pour les données de créneau (basée sur CreneauAutoReservation)
 */
interface CreneauData {
  id: string;
  userId: string;
  codeCarte: string;
  activiteId: string;
  activiteNom: string;
  jour: string;
  horaireDebut: string;
  horaireFin: string;
  actif: boolean;
}

/**
 * Interface pour le résultat de vérification
 */
interface ResultatVerification {
  available: boolean;
  alreadyRegistered?: boolean;
  placesTotales?: number;
  placesOccupees?: number;
  placesDisponibles?: number;
  fileAttente?: boolean;
  error?: string;
  message?: string;
  reservationAutomatique?: {
    tentee: boolean;
    reussie: boolean;
    erreur?: string;
  };
}

/**
 * Envoie une notification Discord
 */
async function envoyerNotificationDiscord(
  titre: string,
  description: string,
  couleur: number = 0x3498db,
  champs: Array<{ name: string; value: string; inline?: boolean }> = []
) {
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
    console.error("❌ Erreur notification Discord:", error);
  }
}

/**
 * Effectue la connexion SUAPS avec un code carte
 */
async function loginSuaps(codeCarte: string): Promise<string> {
  console.log(`🔐 Connexion pour la carte ${codeCarte.substring(0, 6)}...`);
  
  const validation = validateCodeCarte(codeCarte);
  if (!validation.isValid) {
    throw new Error(`Code carte invalide: ${validation.message}`);
  }
  
  const codeCarteProcessed = processCodeCarte(codeCarte);

  const response = await fetch(`${SUAPS_BASE_URL}/api/extended/cartes/auth/login`, {
    method: "POST",
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ codeCarte: codeCarteProcessed }),
  });

  if (!response.ok) {
    throw new Error(`Erreur de connexion SUAPS: ${response.status} ${response.statusText}`);
  }

  // Récupérer les cookies de session
  const sessionCookies = response.headers.get("set-cookie");
  
  console.log(`✅ Connexion réussie pour la carte ${codeCarte.substring(0, 6)}...`);
  return sessionCookies || "";
}

/**
 * Récupère les réservations existantes d'un utilisateur
 */
async function getReservationsUtilisateur(userId: string, sessionCookies: string): Promise<any[]> {
  try {
    console.log(`📋 Récupération des réservations existantes pour l'utilisateur ${userId}...`);
    
    const url = `${SUAPS_BASE_URL}/api/extended/reservation-creneaux?idIndividu=${userId}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...DEFAULT_HEADERS,
        "Cookie": sessionCookies,
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
    console.error(`❌ Erreur lors de la récupération des réservations:`, error);
    return [];
  }
}

/**
 * Calcule la date réelle du prochain créneau selon la logique des 7 jours glissants
 */
function calculerDateCreneauCible(jour: string, horaireDebut: string, horaireFin: string): Date {
  const joursMap: { [key: string]: number } = {
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
 */
function estDejaInscrit(creneau: any, reservations: any[]): boolean {
  if (!reservations || reservations.length === 0) {
    return false;
  }
  
  // Calculer la date cible du créneau selon la logique métier
  const dateCreneauCible = calculerDateCreneauCible(creneau.jour, creneau.horaireDebut, creneau.horaireFin);
  
  const resultat = reservations.some(reservation => {
    const creneauReserve = reservation.creneau;
    
    // Vérifications de base
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
        const diffJours = Math.abs(dateCreneauCible.getTime() - dateReservation.getTime()) / (1000 * 60 * 60 * 24);
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
        
        const diffJours = Math.abs(dateCreneauCible.getTime() - dateReservation.getTime()) / (1000 * 60 * 60 * 24);
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
function calculerDatesOccurrence(jour: string, horaireDebut: string, horaireFin: string): { debut: string; fin: string } {
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
async function reserverCreneauAutomatiquement(creneau: any, sessionCookies: string): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    console.log(`🎯 Tentative de réservation automatique: ${creneau.activiteNom}`);
    
    const { debut, fin } = calculerDatesOccurrence(creneau.jour, creneau.horaireDebut, creneau.horaireFin);
    
    // Récupérer les données utilisateur via l'API profil
    let userData: any = {};
    try {
      const profileResponse = await fetch(`${SUAPS_BASE_URL}/api/individus/me`, {
        method: "GET",
        credentials: "include",
        headers: {
          ...DEFAULT_HEADERS,
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
        tagHexa: null,
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
          ...DEFAULT_HEADERS,
          "Cookie": sessionCookies,
          "Origin": SUAPS_BASE_URL,
          "Referer": `${SUAPS_BASE_URL}/activites`,
        },
        credentials: "include",
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
      message: "Réservation automatique réussie (check-availability API)",
      details: result,
    });
    
    console.log(`✅ Réservation réussie pour ${creneau.activiteNom}`);
    return { success: true, result };
    
  } catch (error) {
    console.error(`❌ Erreur lors de la réservation: ${(error as Error).message}`);
    
    // Déterminer le type d'erreur
    let statut: "FAILED" | "QUOTA_FULL" | "NETWORK_ERROR" = "FAILED";
    if ((error as Error).message.includes("quota") || (error as Error).message.includes("complet")) {
      statut = "QUOTA_FULL";
    } else if ((error as Error).message.includes("réseau") || (error as Error).message.includes("network")) {
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
      message: `Réservation automatique échouée: ${(error as Error).message}`,
      details: { error: (error as Error).message },
    });
    
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Vérifie la disponibilité d'un créneau spécifique
 */
async function verifierDisponibiliteCreneau(
  creneau: any,
  sessionCookies: string,
  reservationsExistantes: any[] = []
): Promise<ResultatVerification> {
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
    const url = `${SUAPS_BASE_URL}/api/extended/creneau-recurrents/semaine?idActivite=${creneau.activiteId}&idPeriode=${process.env.SUAPS_PERIODE_ID || '4dc2c931-12c4-4cac-8709-c9bbb2513e16'}&idIndividu=${creneau.userId}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...DEFAULT_HEADERS,
        "Cookie": sessionCookies,
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
          let reservationInfo = undefined;
          if (isAvailable) {
            console.log(`🎯 Place disponible ! Tentative de réservation automatique...`);
            
            // Tenter la réservation automatique
            const reservationResult = await reserverCreneauAutomatiquement(creneau, sessionCookies);
            
            reservationInfo = {
              tentee: true,
              reussie: reservationResult.success,
              erreur: reservationResult.error
            };
            
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
            fileAttente: creneauAPI.fileAttente || false,
            reservationAutomatique: reservationInfo
          };
        }
      }
      
      console.log(`⚠️  Créneau non trouvé dans la réponse API pour ${creneau.activiteNom}`);
      return { available: false, error: "Créneau non trouvé dans la réponse" };
    }
    
    console.log(`⚠️  Format de réponse inattendu pour ${creneau.activiteNom}`);
    return { available: false, error: "Format de réponse inattendu" };
    
  } catch (error) {
    console.error(`❌ Erreur lors de la vérification du créneau ${creneau.activiteNom}:`, error);
    return { available: false, error: (error as Error).message };
  }
}

/**
 * Vérifie la disponibilité de tous les créneaux pour un utilisateur
 */
async function verifierTousLesCreneaux(): Promise<{
  success: boolean;
  message: string;
  results: Array<{
    creneau: any;
    result: ResultatVerification;
  }>;
  stats: {
    total: number;
    available: number;
    alreadyRegistered: number;
    errors: number;
  };
}> {
  console.log("🚀 Démarrage de la vérification de disponibilité des créneaux");
  
  const results: Array<{ creneau: any; result: ResultatVerification }> = [];
  const stats = { total: 0, available: 0, alreadyRegistered: 0, errors: 0 };
  
  try {
    // Récupérer tous les créneaux configurés
    const creneaux = await getCreneauxAutoReservation();
    console.log(`📋 ${creneaux.length} créneaux trouvés dans la base de données`);
    
    if (creneaux.length === 0) {
      return {
        success: true,
        message: "Aucun créneau configuré pour l'auto-réservation",
        results: [],
        stats
      };
    }
    
    // Grouper les créneaux par utilisateur pour optimiser les connexions
    const creneauxParUtilisateur = new Map<string, any[]>();
    creneaux.forEach(creneau => {
      if (!creneauxParUtilisateur.has(creneau.userId)) {
        creneauxParUtilisateur.set(creneau.userId, []);
      }
      creneauxParUtilisateur.get(creneau.userId)!.push(creneau);
    });
    
    console.log(`👥 ${creneauxParUtilisateur.size} utilisateur(s) unique(s) trouvé(s)`);
    
    // Traiter chaque utilisateur
    const utilisateurs = Array.from(creneauxParUtilisateur.entries());
    for (const [userId, creneauxUtilisateur] of utilisateurs) {
      console.log(`\n🔄 Traitement des créneaux pour l'utilisateur ${userId}:`);
      
      try {
        // Se connecter avec le code carte du premier créneau
        const premierCreneau = creneauxUtilisateur[0];
        const sessionCookies = await loginSuaps(premierCreneau.codeCarte);
        
        // Récupérer les réservations existantes de l'utilisateur
        const reservationsExistantes = await getReservationsUtilisateur(userId, sessionCookies);
        
        // Vérifier chaque créneau de cet utilisateur
        for (const creneau of creneauxUtilisateur) {
          const resultat = await verifierDisponibiliteCreneau(creneau, sessionCookies, reservationsExistantes);
          
          results.push({ creneau, result: resultat });
          stats.total++;
          
          if (resultat.alreadyRegistered) {
            stats.alreadyRegistered++;
          } else if (resultat.available) {
            stats.available++;
            console.log(`🎉 PLACES DISPONIBLES! ${creneau.activiteNom} - ${creneau.jour} ${creneau.horaireDebut}-${creneau.horaireFin} (${resultat.placesDisponibles} places libres)`);
          } else if (resultat.error) {
            stats.errors++;
          }
          
          // Petite pause entre les requêtes pour éviter de surcharger l'API
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de l'utilisateur ${userId}:`, error);
        // Marquer tous les créneaux de cet utilisateur comme en erreur
        creneauxUtilisateur.forEach((creneau: any) => {
          results.push({ 
            creneau, 
            result: { available: false, error: (error as Error).message } 
          });
          stats.total++;
          stats.errors++;
        });
      }
      
      // Pause entre les utilisateurs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return {
      success: true,
      message: `Vérification terminée: ${stats.available} places disponibles trouvées sur ${stats.total} créneaux`,
      results,
      stats
    };
    
  } catch (error) {
    console.error("❌ Erreur lors de la vérification des créneaux:", error);
    return {
      success: false,
      message: `Erreur lors de la vérification: ${(error as Error).message}`,
      results,
      stats
    };
  }
}

/**
 * Endpoint GET pour vérifier la disponibilité des créneaux
 */
export async function GET(request: NextRequest) {
  const startTime = new Date();
  console.log(`⏰ Début de la vérification à ${startTime.toLocaleTimeString("fr-FR")}`);
  
  try {
    // Vérifier l'authentification (optionnel pour cet endpoint)
    const user = await getCurrentUserFromRequest(request);
    if (user) {
      console.log(`👤 Vérification demandée par l'utilisateur: ${user.nom} ${user.prenom}`);
    }
    
    // Configuration depuis les paramètres de requête
    const { searchParams } = new URL(request.url);
    const userIdFilter = searchParams.get('userId'); // Filtrer par utilisateur spécifique
    const detailed = searchParams.get('detailed') === 'true'; // Résultats détaillés
    
    console.log("🔧 Configuration:");
    console.log(`📍 SUAPS_BASE_URL: ${SUAPS_BASE_URL}`);
    console.log(`📍 SUAPS_PERIODE_ID: ${process.env.SUAPS_PERIODE_ID || 'NON DÉFINI'}`);
    
    const resultats = await verifierTousLesCreneaux();
    
    // Filtrer par utilisateur si demandé
    if (userIdFilter && resultats.results) {
      resultats.results = resultats.results.filter(r => r.creneau.userId === userIdFilter);
      // Recalculer les stats
      resultats.stats = {
        total: resultats.results.length,
        available: resultats.results.filter(r => r.result.available).length,
        alreadyRegistered: resultats.results.filter(r => r.result.alreadyRegistered).length,
        errors: resultats.results.filter(r => r.result.error).length,
      };
    }
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(`\n✅ Vérification terminée en ${duration}ms à ${endTime.toLocaleTimeString("fr-FR")}`);
    
    // Retourner les résultats (détaillés ou résumés)
    if (detailed) {
      return NextResponse.json({
        success: resultats.success,
        message: resultats.message,
        results: resultats.results,
        stats: resultats.stats,
        duration,
        timestamp: endTime.toISOString()
      });
    } else {
      // Version résumée pour l'interface utilisateur
      return NextResponse.json({
        success: resultats.success,
        message: resultats.message,
        stats: resultats.stats,
        availableSlots: resultats.results
          .filter(r => r.result.available)
          .map(r => ({
            activiteNom: r.creneau.activiteNom,
            jour: r.creneau.jour,
            horaires: `${r.creneau.horaireDebut}-${r.creneau.horaireFin}`,
            placesDisponibles: r.result.placesDisponibles,
            placesTotales: r.result.placesTotales
          })),
        duration,
        timestamp: endTime.toISOString()
      });
    }
    
  } catch (error) {
    console.error("💥 Erreur fatale:", error);
    
    return NextResponse.json({
      success: false,
      error: "Erreur lors de la vérification de disponibilité",
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
    
  } finally {
    // Fermer la connexion à la base de données
    try {
      await disconnectDatabase();
    } catch (error) {
      console.error("⚠️  Erreur lors de la fermeture de la base de données:", error);
    }
  }
}

/**
 * Endpoint POST pour déclencher une vérification manuelle
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification pour les actions manuelles
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, userId } = body;
    
    if (action === "check-now") {
      // Déclencher une vérification immédiate
      console.log(`🚀 Vérification manuelle déclenchée par ${user.nom} ${user.prenom}`);
      
      // Rediriger vers GET avec paramètres
      const url = new URL(request.url);
      if (userId) {
        url.searchParams.set('userId', userId);
      }
      url.searchParams.set('detailed', 'true');
      
      const getRequest = new NextRequest(url.toString(), { method: 'GET' });
      return GET(getRequest);
    }
    
    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
    
  } catch (error) {
    console.error("Erreur lors de l'action:", error);
    return NextResponse.json({
      error: "Erreur serveur",
      message: (error as Error).message
    }, { status: 500 });
  }
}
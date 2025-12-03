// Wrapper JavaScript pour database.ts
import { PrismaClient } from '../../node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

/**
 * Fonction utilitaire pour transformer les données Prisma en interface compatible
 */
function transformPrismaToInterface(creneau) {
  return {
    id: creneau.id,
    userId: creneau.userId,
    codeCarte: creneau.codeCarte,
    
    // IDs réels SUAPS
    activiteId: creneau.activiteId,
    creneauId: creneau.creneauId,
    
    // Données de base
    activiteNom: creneau.activiteNom,
    activiteDescription: creneau.activiteDescription,
    jour: creneau.jour,
    horaireDebut: creneau.horaireDebut,
    horaireFin: creneau.horaireFin,
    
    // Données complètes de l'activité
    activiteTarif: creneau.activiteTarif,
    activiteQuota: creneau.activiteQuota,
    activiteFileAttente: creneau.activiteFileAttente,
    activiteMaxReservationParSemaine: creneau.activiteMaxReservationParSemaine,
    activiteInscriptionAnnuelle: creneau.activiteInscriptionAnnuelle,
    activiteAffichageOnly: creneau.activiteAffichageOnly,
    activiteNbInscrits: creneau.activiteNbInscrits,
    activitePosition: creneau.activitePosition,
    activiteStatutInscription: creneau.activiteStatutInscription,
    activiteNbCreneaux: creneau.activiteNbCreneaux,
    activiteInscriptionEnCours: creneau.activiteInscriptionEnCours,
    activiteInscriptionAnnulable: creneau.activiteInscriptionAnnulable,
    
    // Données complètes du créneau
    quotaLoisir: creneau.quotaLoisir,
    quotaCursus: creneau.quotaCursus,
    quotaMinimum: creneau.quotaMinimum,
    niveau: creneau.niveau,
    fileAttente: creneau.fileAttente,
    quota: creneau.quota,
    nbMoyenInscrits: creneau.nbMoyenInscrits,
    nbInscrits: creneau.nbInscrits,
    nbMoyenPresents: creneau.nbMoyenPresents,
    encadrants: creneau.encadrants,
    encadrantsLibelle: creneau.encadrantsLibelle,
    fermetures: creneau.fermetures,
    
    // Données structurelles
    catalogue: creneau.catalogue,
    famille: creneau.famille,
    annee: creneau.annee,
    periodes: creneau.periodes,
    
    // Localisation
    localisation: creneau.localisation,
    
    // Statut et gestion
    actif: creneau.actif,
    dateCreation: creneau.dateCreation.toISOString(),
    derniereTentative: creneau.derniereTentative?.toISOString(),
    derniereReservation: creneau.derniereReservation?.toISOString(),
    nbTentatives: creneau.nbTentatives,
    nbReussites: creneau.nbReussites,
    options: creneau.options
  };
}

/**
 * Récupère tous les créneaux actifs d'auto-réservation avec timeout
 */
export async function getCreneauxAutoReservation() {
  console.log("Récupération des créneaux actifs d'auto-réservation...");
  
  try {
    // Test de connexion d'abord
    console.log("Test de connexion à la base de données...");
    await prisma.$connect();
    console.log("Connexion réussie");
    
    // Requête avec timeout de 10 secondes
    console.log("Exécution de la requête findMany...");
    const creneaux = await Promise.race([
      prisma.creneauAutoReservation.findMany({
        where: {
          actif: true
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout de la requête après 10 secondes')), 10000)
      )
    ]);
    
    console.log(`Trouvé ${creneaux.length} créneaux actifs`);
    return creneaux.map(transformPrismaToInterface);
    
  } catch (error) {
    console.error("Erreur lors de la récupération des créneaux:", error);
    
    // Essayer une requête plus simple pour diagnostiquer
    try {
      console.log("Tentative de requête de diagnostic...");
      const count = await prisma.creneauAutoReservation.count();
      console.log(`Nombre total de créneaux dans la DB: ${count}`);
    } catch (countError) {
      console.error("Erreur même pour le count:", countError);
    }
    
    throw error;
  }
}

/**
 * Met à jour un créneau d'auto-réservation
 */
export async function mettreAJourCreneauAutoReservation(id, data) {
  try {
    const updated = await prisma.creneauAutoReservation.update({
      where: { id },
      data: {
        derniereTentative: data.derniereTentative ? new Date(data.derniereTentative) : undefined,
        derniereReservation: data.derniereReservation ? new Date(data.derniereReservation) : undefined,
        nbTentatives: data.nbTentatives,
        nbReussites: data.nbReussites,
      }
    });
    return updated;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du créneau:', error);
    throw error;
  }
}

/**
 * Enregistre un log de réservation
 */
export async function enregistrerLogReservation(logData) {
  try {
    const log = await prisma.logReservation.create({
      data: {
        userId: logData.userId,
        creneauAutoId: logData.creneauAutoId,
        timestamp: new Date(logData.timestamp),
        statut: logData.statut,
        message: logData.message,
        details: logData.details || {},
      }
    });
    return log;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du log:', error);
    // Ne pas faire échouer le script pour un log
  }
}

/**
 * Ferme la connexion Prisma (utile pour les scripts)
 */
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
  }
}
/**
 * Configuration et utilitaires MongoDB avec Prisma pour l'auto-réservation
 */

import { PrismaClient } from '@prisma/client';

// Types pour maintenir la compatibilité avec l'ancienne interface Firebase
export interface CreneauAutoReservation {
  id: string;
  userId: string; // Code utilisateur issu de user.code lors de l'authentification (ex: "b2ad458a")
  codeCarte: string; // Code carte SUAPS original (ex: "1220277161303184", PAS le format hexadécimal)
  
  // IDs réels SUAPS
  activiteId: string;
  creneauId: string;
  
  // Données de base
  activiteNom: string;
  activiteDescription?: string;
  jour: string; // LUNDI, MARDI, etc.
  horaireDebut: string;
  horaireFin: string;
  
  // Données complètes de l'activité
  activiteTarif?: any;
  activiteQuota?: number;
  activiteFileAttente?: boolean;
  activiteMaxReservationParSemaine?: number;
  activiteInscriptionAnnuelle?: boolean;
  activiteAffichageOnly?: boolean;
  activiteNbInscrits?: number;
  activitePosition?: number;
  activiteStatutInscription?: any;
  activiteNbCreneaux?: number;
  activiteInscriptionEnCours?: any;
  activiteInscriptionAnnulable?: any;
  
  // Données complètes du créneau
  quotaLoisir?: number;
  quotaCursus?: number;
  quotaMinimum?: number;
  niveau?: string;
  fileAttente?: boolean;
  quota?: number;
  nbMoyenInscrits?: number;
  nbInscrits?: number;
  nbMoyenPresents?: number;
  encadrants?: any[];
  encadrantsLibelle?: string;
  fermetures?: any[];
  
  // Données structurelles
  catalogue?: any;
  famille?: any;
  annee?: any;
  periodes?: any[];
  
  // Localisation
  localisation?: {
    id?: string;
    nom: string;
    adresse: string;
    ville: string;
    codePostal?: string;
    complementAdresse?: string;
    reglementInterieur?: string;
    site?: any;
    annee?: any;
  };
  
  // Statut et gestion
  actif: boolean;
  dateCreation: string;
  derniereTentative?: string;
  derniereReservation?: string;
  nbTentatives: number;
  nbReussites: number;
  options?: {
    maxTentatives?: number;
    notifierEchec?: boolean;
    priorite?: number; // 1-5, 1 = plus prioritaire
  };
}

export interface LogReservation {
  id: string;
  userId: string;
  creneauAutoId: string;
  timestamp: string;
  statut: 'SUCCESS' | 'FAILED' | 'QUOTA_FULL' | 'AUTH_ERROR' | 'NETWORK_ERROR';
  message: string;
  details?: any;
  // Détails du créneau enrichis
  activiteNom?: string;
  jour?: string;
  horaireDebut?: string;
}

// Instance Prisma globale pour éviter les connexions multiples
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma || new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Configuration spéciale pour l'environnement serverless
if (process.env.VERCEL) {
  // Ne pas forcer la connexion au démarrage en serverless
  // Laisser Prisma gérer la connexion à la demande
  console.log('Environment Vercel détecté - connexion à la demande');
}

/**
 * Récupère tous les créneaux actifs d'auto-réservation avec timeout
 */
export async function getCreneauxAutoReservation(): Promise<CreneauAutoReservation[]> {
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
    ]) as any[];
    
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
      console.error("Erreur lors du count:", countError);
    }
    
    throw error;
  }
}

/**
 * Récupère les créneaux d'auto-réservation pour un utilisateur
 */
export async function getCreneauxUtilisateur(userId: string): Promise<CreneauAutoReservation[]> {
  try {
    console.log(`Récupération des créneaux pour l'utilisateur: ${userId}`);
    
    // Forcer la connexion explicitement en cas de problème
    await prisma.$connect();
    
    // Requête avec timeout de 5 secondes
    const creneaux = await Promise.race([
      prisma.creneauAutoReservation.findMany({
        where: {
          userId: userId
        },
        orderBy: {
          dateCreation: 'desc'
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout de la requête getCreneauxUtilisateur après 5 secondes')), 5000)
      )
    ]) as any[];
    
    console.log(`Trouvé ${creneaux.length} créneaux pour l'utilisateur`);
    return creneaux.map(transformPrismaToInterface);
    
  } catch (error) {
    console.error('Erreur dans getCreneauxUtilisateur:', error);
    
    // Tentative de reconnexion si erreur d'authentification
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('authentication failed') || errorMessage.includes('SCRAM')) {
      console.log('Tentative de reconnexion...');
      await prisma.$disconnect();
      await prisma.$connect();
      
      // Retry une fois avec timeout plus court
      const creneaux = await Promise.race([
        prisma.creneauAutoReservation.findMany({
          where: {
            userId: userId
          },
          orderBy: {
            dateCreation: 'desc'
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout retry après 3 secondes')), 3000)
        )
      ]) as any[];
      
      console.log(`Retry réussi: ${creneaux.length} créneaux trouvés`);
      return creneaux.map(transformPrismaToInterface);
    }
    
    // En cas d'erreur, retourner un tableau vide plutôt que de planter
    console.warn('Retour d\'un tableau vide à cause de l\'erreur');
    return [];
  }
}

/**
 * Ajoute un nouveau créneau d'auto-réservation
 * IMPORTANT: 
 * - userId doit être le code utilisateur authentifié (ex: "b2ad458a")
 * - codeCarte doit être le code carte original (ex: "1220277161303184")
 */
export async function ajouterCreneauAutoReservation(
  creneau: Omit<CreneauAutoReservation, 'id' | 'dateCreation' | 'nbTentatives' | 'nbReussites'>
): Promise<string> {
  // Validation du code carte
  const codeCarteNettoye = creneau.codeCarte.replace(/\D/g, '');
  if (codeCarteNettoye.length < 10 || codeCarteNettoye.length > 20) {
    throw new Error(`Code carte invalide: ${creneau.codeCarte}. Doit contenir 10-20 chiffres.`);
  }
    
  const nouveauCreneau = await prisma.creneauAutoReservation.create({
    data: {
      userId: creneau.userId, // Code utilisateur issu de l'authentification (ex: "b2ad458a")
      codeCarte: codeCarteNettoye, // Code carte original nettoyé (ex: "1220277161303184")
      
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
      nbTentatives: 0,
      nbReussites: 0,
      options: creneau.options,
    }
  });
  
  return nouveauCreneau.id;
}

/**
 * Met à jour un créneau d'auto-réservation
 */
export async function mettreAJourCreneauAutoReservation(
  id: string, 
  updates: Partial<CreneauAutoReservation>
): Promise<void> {
  // Transformer les dates string en Date objects si nécessaire
  const prismaUpdates: any = { ...updates };
  if (updates.derniereTentative) {
    prismaUpdates.derniereTentative = new Date(updates.derniereTentative);
  }
  if (updates.derniereReservation) {
    prismaUpdates.derniereReservation = new Date(updates.derniereReservation);
  }
  
  await prisma.creneauAutoReservation.update({
    where: { id },
    data: prismaUpdates
  });
}

/**
 * Supprime un créneau d'auto-réservation
 */
export async function supprimerCreneauAutoReservation(id: string): Promise<void> {
  await prisma.creneauAutoReservation.delete({
    where: { id }
  });
}

/**
 * Enregistre un log de tentative de réservation
 */
export async function enregistrerLogReservation(log: Omit<LogReservation, 'id'>): Promise<void> {
  await prisma.logReservation.create({
    data: {
      userId: log.userId,
      creneauAutoId: log.creneauAutoId,
      timestamp: new Date(log.timestamp),
      statut: log.statut as any,
      message: log.message,
      details: log.details
    }
  });
}

/**
 * Récupère les logs pour un utilisateur
 */
export async function getLogsUtilisateur(userId: string, limit: number = 50): Promise<LogReservation[]> {
  try {
    // Forcer la connexion explicitement en cas de problème
    await prisma.$connect();
    
    const logs = await prisma.logReservation.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });
    
    // Récupérer les créneaux pour enrichir les logs avec les détails
    const creneauIds = logs.map(log => log.creneauAutoId);
    const creneaux = await prisma.creneauAutoReservation.findMany({
      where: {
        id: { in: creneauIds }
      }
    });
    
    // Créer un map pour un accès rapide aux créneaux
    const creneauxMap = new Map(creneaux.map(c => [c.id, c]));
    
    return logs.map(log => {
      const creneau = creneauxMap.get(log.creneauAutoId);
      return {
        id: log.id,
        userId: log.userId,
        creneauAutoId: log.creneauAutoId,
        timestamp: log.timestamp.toISOString(),
        statut: log.statut as any,
        message: log.message,
        details: log.details,
        // Ajouter les détails du créneau s'ils sont disponibles
        activiteNom: creneau?.activiteNom || 'Activité inconnue',
        jour: creneau?.jour || '',
        horaireDebut: creneau?.horaireDebut || ''
      };
    });
  } catch (error) {
    console.error('Erreur dans getLogsUtilisateur:', error);
    
    // Tentative de reconnexion si erreur d'authentification
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('authentication failed') || errorMessage.includes('SCRAM')) {
      console.log('Tentative de reconnexion...');
      await prisma.$disconnect();
      await prisma.$connect();
      
      // Retry une fois
      const logs = await prisma.logReservation.findMany({
        where: {
          userId: userId
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit
      });
      
      return logs.map(log => ({
        id: log.id,
        userId: log.userId,
        creneauAutoId: log.creneauAutoId,
        timestamp: log.timestamp.toISOString(),
        statut: log.statut as any,
        message: log.message,
        details: log.details
      }));
    }
    
    throw error;
  }
}

/**
 * Vérifie si un créneau est déjà programmé pour auto-réservation
 */
export async function creneauDejaPrograme(userId: string, creneauId: string): Promise<boolean> {
  const count = await prisma.creneauAutoReservation.count({
    where: {
      userId: userId,
      creneauId: creneauId,
      actif: true
    }
  });
  
  return count > 0;
}

/**
 * Calcule le prochain jour de réservation (7 jours glissants)
 * Règle : on peut réserver pour un jour donné à partir de ce même jour jusqu'au même jour de la semaine suivante
 */
export function calculerProchaineReservation(jour: string): Date {
  const joursMap: { [key: string]: number } = {
    'DIMANCHE': 0,
    'LUNDI': 1,
    'MARDI': 2,
    'MERCREDI': 3,
    'JEUDI': 4,
    'VENDREDI': 5,
    'SAMEDI': 6
  };
  
  const jourCible = joursMap[jour.toUpperCase()];
  const maintenant = new Date();
  const jourActuel = maintenant.getDay();
  
  // Calcule combien de jours jusqu'au prochain jour cible
  let joursJusquauCible = (jourCible - jourActuel + 7) % 7;
  
  // Si c'est 0 (même jour), on prend la semaine suivante (7 jours)
  if (joursJusquauCible === 0) {
    joursJusquauCible = 7;
  }
  
  // La date cible est dans joursJusquauCible jours
  const prochaineDate = new Date(maintenant);
  prochaineDate.setDate(prochaineDate.getDate() + joursJusquauCible);
  
  // Remettre l'heure à minuit pour éviter les problèmes de comparaison
  prochaineDate.setHours(0, 0, 0, 0);
  
  return prochaineDate;
}

/**
 * Fonction utilitaire pour transformer les données Prisma en interface compatible
 */
function transformPrismaToInterface(creneau: any): CreneauAutoReservation {
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
 * Ferme la connexion Prisma (utile pour les scripts)
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

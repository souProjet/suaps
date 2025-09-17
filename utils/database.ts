/**
 * Configuration et utilitaires MongoDB avec Prisma pour l'auto-réservation
 */

import { PrismaClient } from '@prisma/client';

// Types pour maintenir la compatibilité avec l'ancienne interface Firebase
export interface CreneauAutoReservation {
  id: string;
  userId: string; // Code carte SUAPS
  activiteId: string;
  activiteNom: string;
  creneauId: string;
  jour: string; // LUNDI, MARDI, etc.
  horaireDebut: string;
  horaireFin: string;
  localisation?: {
    nom: string;
    adresse: string;
    ville: string;
  };
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
}

// Instance Prisma globale pour éviter les connexions multiples
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

/**
 * Récupère tous les créneaux actifs d'auto-réservation
 */
export async function getCreneauxAutoReservation(): Promise<CreneauAutoReservation[]> {
  const creneaux = await prisma.creneauAutoReservation.findMany({
    where: {
      actif: true
    }
  });
  
  return creneaux.map(transformPrismaToInterface);
}

/**
 * Récupère les créneaux d'auto-réservation pour un utilisateur
 */
export async function getCreneauxUtilisateur(userId: string): Promise<CreneauAutoReservation[]> {
  const creneaux = await prisma.creneauAutoReservation.findMany({
    where: {
      userId: userId
    },
    orderBy: {
      dateCreation: 'desc'
    }
  });
  
  return creneaux.map(transformPrismaToInterface);
}

/**
 * Ajoute un nouveau créneau d'auto-réservation
 */
export async function ajouterCreneauAutoReservation(
  creneau: Omit<CreneauAutoReservation, 'id' | 'dateCreation' | 'nbTentatives' | 'nbReussites'>
): Promise<string> {
  const nouveauCreneau = await prisma.creneauAutoReservation.create({
    data: {
      userId: creneau.userId,
      activiteId: creneau.activiteId,
      activiteNom: creneau.activiteNom,
      creneauId: creneau.creneauId,
      jour: creneau.jour,
      horaireDebut: creneau.horaireDebut,
      horaireFin: creneau.horaireFin,
      localisation: creneau.localisation,
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
  const demain = new Date(maintenant);
  demain.setDate(demain.getDate() + 1);
  
  // Trouve le prochain jour correspondant dans 7 jours
  const prochaineDate = new Date(demain);
  prochaineDate.setDate(prochaineDate.getDate() + 7);
  
  // Ajuste au bon jour de la semaine
  const jourActuel = prochaineDate.getDay();
  const diffJours = (jourCible - jourActuel + 7) % 7;
  prochaineDate.setDate(prochaineDate.getDate() + diffJours);
  
  return prochaineDate;
}

/**
 * Fonction utilitaire pour transformer les données Prisma en interface compatible
 */
function transformPrismaToInterface(creneau: any): CreneauAutoReservation {
  return {
    id: creneau.id,
    userId: creneau.userId,
    activiteId: creneau.activiteId,
    activiteNom: creneau.activiteNom,
    creneauId: creneau.creneauId,
    jour: creneau.jour,
    horaireDebut: creneau.horaireDebut,
    horaireFin: creneau.horaireFin,
    localisation: creneau.localisation,
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

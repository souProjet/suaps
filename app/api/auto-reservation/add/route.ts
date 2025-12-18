import { NextRequest, NextResponse } from 'next/server';
import { ajouterCreneauAutoReservation, creneauDejaPrograme } from '@/utils/database';
import { getCurrentUserFromRequest } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    
    const {
      codeCarte,
      activiteId,
      activiteNom,
      creneauId,
      jour,
      horaireDebut,
      horaireFin,
      localisation,
      options,
      // Nouveaux champs
      ...autresChamps
    } = body;

    // Validation des données avec debug détaillé
    const donneesManquantes = [];
    if (!codeCarte) donneesManquantes.push('codeCarte');
    if (!activiteId) donneesManquantes.push('activiteId');
    if (!activiteNom) donneesManquantes.push('activiteNom');
    if (!creneauId) donneesManquantes.push('creneauId');
    if (!jour) donneesManquantes.push('jour');
    if (!horaireDebut) donneesManquantes.push('horaireDebut');
    if (!horaireFin) donneesManquantes.push('horaireFin');
    
    if (donneesManquantes.length > 0) {
      console.error('❌ Données manquantes:', donneesManquantes);
      console.error('❌ Données reçues:', { 
        codeCarte: codeCarte ? '***' : undefined,
        activiteId, activiteNom, creneauId, jour, horaireDebut, horaireFin 
      });
      
      return NextResponse.json(
        { 
          error: `Données manquantes: ${donneesManquantes.join(', ')}`,
          details: { donneesManquantes }
        },
        { status: 400 }
      );
    }
    
    // Vérifier si le créneau n'est pas déjà programmé
    const dejaPrograme = await creneauDejaPrograme(user.code, creneauId); // Utiliser user.code pour l'ID utilisateur
    if (dejaPrograme) {
      return NextResponse.json(
        { error: 'Ce créneau est déjà programmé pour auto-réservation' },
        { status: 409 }
      );
    }

    // Ajouter le créneau avec toutes les données
    const id = await ajouterCreneauAutoReservation({
      userId: user.code, // Code utilisateur authentifié (ex: "b2ad458a")
      codeCarte: codeCarte, // Code carte original (ex: "1220277161303184")
      
      // IDs réels SUAPS
      activiteId,
      creneauId,
      
      // Données de base
      activiteNom,
      jour,
      horaireDebut,
      horaireFin,
      localisation,
      
      // Toutes les autres données reçues
      ...autresChamps,
      
      // Configuration
      actif: true,
      options: {
        maxTentatives: 5,
        notifierEchec: true,
        priorite: 3,
        ...options
      }
    });
    
    return NextResponse.json({ id, message: 'Créneau ajouté avec succès' });
    
  } catch (error) {
    console.error('Erreur lors de l\'ajout du créneau:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

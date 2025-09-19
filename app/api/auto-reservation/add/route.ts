import { NextRequest, NextResponse } from 'next/server';
import { ajouterCreneauAutoReservation, creneauDejaPrograme } from '@/utils/database';
import { getCurrentUserFromRequest } from '@/utils/auth';
import { convertHexToCodeCarte } from '@/utils/codeConverter';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const {
      activiteId,
      activiteNom,
      creneauId,
      jour,
      horaireDebut,
      horaireFin,
      localisation,
      options
    } = body;

    // Validation des données
    if (!activiteId || !activiteNom || !creneauId || !jour || !horaireDebut || !horaireFin) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }
    const codeCarte = convertHexToCodeCarte(user.tagHexa);
    
    // Vérifier si le créneau n'est pas déjà programmé
    const dejaPrograme = await creneauDejaPrograme(user.code, creneauId); // Utiliser user.code pour l'ID utilisateur
    if (dejaPrograme) {
      return NextResponse.json(
        { error: 'Ce créneau est déjà programmé pour auto-réservation' },
        { status: 409 }
      );
    }

    // Ajouter le créneau
    const id = await ajouterCreneauAutoReservation({
      userId: user.code, // Code utilisateur authentifié (ex: "b2ad458a")
      codeCarte: codeCarte, // Code carte original (ex: "1220277161303184")
      activiteId,
      activiteNom,
      creneauId,
      jour,
      horaireDebut,
      horaireFin,
      localisation,
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

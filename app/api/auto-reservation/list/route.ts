import { NextRequest, NextResponse } from 'next/server';
import { getCreneauxUtilisateur } from '@/utils/database';
import { getCurrentUserFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer les créneaux de l'utilisateur
    const creneaux = await getCreneauxUtilisateur(user.code);
    
    return NextResponse.json(creneaux);
    
  } catch (error) {
    console.error('Erreur lors de la récupération des créneaux:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

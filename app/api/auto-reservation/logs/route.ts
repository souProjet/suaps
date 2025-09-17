import { NextRequest, NextResponse } from 'next/server';
import { getLogsUtilisateur } from '@/utils/database';
import { getCurrentUserFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer les logs de l'utilisateur
    const logs = await getLogsUtilisateur(user.code, 50);
    
    return NextResponse.json(logs);
    
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

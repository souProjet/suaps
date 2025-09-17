import { NextRequest, NextResponse } from 'next/server';
import { mettreAJourCreneauAutoReservation, prisma } from '@/utils/database';
import { getCurrentUserFromRequest } from '@/utils/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { actif } = body;

    // Vérifier que le créneau appartient à l'utilisateur
    const creneau = await prisma.creneauAutoReservation.findUnique({
      where: { id }
    });
    
    if (!creneau) {
      return NextResponse.json(
        { error: 'Créneau non trouvé' },
        { status: 404 }
      );
    }

    if (creneau.userId !== user.code) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    // Mettre à jour le statut
    await mettreAJourCreneauAutoReservation(id, { actif });
    
    return NextResponse.json({ 
      message: `Créneau ${actif ? 'activé' : 'désactivé'} avec succès` 
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du créneau:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

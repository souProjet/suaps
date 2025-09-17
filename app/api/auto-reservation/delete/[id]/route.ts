import { NextRequest, NextResponse } from 'next/server';
import { supprimerCreneauAutoReservation, prisma } from '@/utils/database';
import { getCurrentUserFromRequest } from '@/utils/auth';

export async function DELETE(
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

    // Supprimer le créneau
    await supprimerCreneauAutoReservation(id);
    
    return NextResponse.json({ message: 'Créneau supprimé avec succès' });
    
  } catch (error) {
    console.error('Erreur lors de la suppression du créneau:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { fetchActivites } from '@/utils/suaps';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    // Récupérer les paramètres de l'URL de manière compatible avec le rendu statique
    const url = new URL(request.url);
    const catalogue = url.searchParams.get('catalogue') || '';
    const annee = url.searchParams.get('annee') || '';
    
    if (!catalogue || !annee) {
      return NextResponse.json(
        { error: 'Les paramètres catalogue et annee sont requis' },
        { status: 400 }
      );
    }

    const activites = await fetchActivites(catalogue, annee);
    return NextResponse.json(activites);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des activités SUAPS:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des activités' },
      { status: 500 }
    );
  }
} 
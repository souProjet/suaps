import { NextResponse } from 'next/server';
import { ActiviteAPI } from '@/types/suaps';

const SUAPS_API_URL = process.env.SUAPS_API_URL || 'https://u-sport.univ-nantes.fr/api/extended/activites';

// Cette route est dynamique car elle dépend des paramètres de query
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const catalogueId = searchParams.get('catalogueId');
    
    if (!catalogueId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID du catalogue requis',
          data: []
        },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      idPeriode: process.env.SUAPS_PERIODE_ID || '',
      idCatalogue: catalogueId,
      inscriptionsOuvertes: 'false'
    });

    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    };

    console.log('🔄 Récupération des données SUAPS...');
    
    const response = await fetch(`${SUAPS_API_URL}?${params}`, {
      headers,
      // Pas de cache Next.js pour éviter l'erreur des données > 2MB
      // Le cache sera géré par IndexedDB côté client
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Vérifier que les données sont bien un array
    if (!Array.isArray(data)) {
      throw new Error('Format de données inattendu : la réponse n\'est pas une liste');
    }

    console.log(`✅ ${data.length} activités récupérées`);

    // Typer les données pour TypeScript
    const activites: ActiviteAPI[] = data.map((item: any) => ({
      nom: item.nom || '',
      creneaux: Array.isArray(item.creneaux) ? item.creneaux.map((c: any) => ({
        horaireDebut: c.horaireDebut || '',
        horaireFin: c.horaireFin || '',
        jour: c.jour || '',
        localisation: c.localisation ? {
          id: c.localisation.id || '',
          nom: c.localisation.nom || '',
          adresse: c.localisation.adresse || '',
          ville: c.localisation.ville || '',
          codePostal: c.localisation.codePostal || '',
          complementAdresse: c.localisation.complementAdresse
        } : undefined
      })) : []
    }));

    return NextResponse.json({
      success: true,
      data: activites,
      count: activites.length
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données SUAPS:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        data: []
      },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { CatalogueAPI, CatalogueOption } from '@/types/suaps';

const CATALOGUES_API_URL = 'https://u-sport.univ-nantes.fr/api/extended/catalogues/home';

// Cette route peut être mise en cache mais on garde la dynamique pour le revalidate
export const revalidate = 604800; // 1 semaine

export async function GET() {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    };
    
    const response = await fetch(CATALOGUES_API_URL, {
      headers,
      // Cache de 1 semaine (604800 secondes)
      next: { revalidate: 604800 }
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Vérifier que les données sont bien un array
    if (!Array.isArray(data)) {
      throw new Error('Format de données inattendu : la réponse n\'est pas une liste');
    }

    // Typer et transformer les données pour TypeScript
    const catalogues: CatalogueAPI[] = data.map((item: any) => ({
      id: item.id || '',
      nom: item.nom || '',
      description: item.description || '',
      ordreAffichage: item.ordreAffichage || 0,
      type: item.type || '',
      annee: {
        id: item.annee?.id || '',
        annee: item.annee?.annee || new Date().getFullYear()
      },
      affichageHome: item.affichageHome || false
    }));

    // Transformer en options simplifiées pour le frontend
    const catalogueOptions: CatalogueOption[] = catalogues.map(catalogue => {
      // Extraire le nom de la ville depuis le nom du catalogue
      let ville = catalogue.nom.replace('Catalogue ', '');
      
      return {
        id: catalogue.id,
        nom: catalogue.nom,
        ville: ville
      };
    });

    return NextResponse.json({
      success: true,
      data: catalogueOptions,
      count: catalogueOptions.length
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des catalogues SUAPS:', error);
    
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
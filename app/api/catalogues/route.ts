import { NextResponse } from 'next/server';
import { CatalogueAPI, CatalogueOption } from '@/types/suaps';

const CATALOGUES_API_URL = 'https://u-sport.univ-nantes.fr/api/extended/catalogues/home';

export async function GET() {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    };

    console.log('🔄 Récupération des catalogues SUAPS...');
    
    const response = await fetch(CATALOGUES_API_URL, {
      headers,
      // Désactiver le cache pour avoir les données les plus récentes
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

    console.log(`✅ ${data.length} catalogues récupérés`);

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
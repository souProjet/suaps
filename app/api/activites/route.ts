import { NextResponse } from 'next/server';
import { ActiviteAPI } from '@/types/suaps';

const SUAPS_API_URL = process.env.SUAPS_API_URL;

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


    // Conserver TOUTES les données complètes de l'API SUAPS
    const activites: ActiviteAPI[] = data.map((item: any) => ({
      // IDs et données de base
      id: item.id || '',
      nom: item.nom || '',
      description: item.description || '',
      typePrestation: item.typePrestation || 'ACTIVITE',
      tarif: item.tarif,
      quota: item.quota,
      fileAttente: item.fileAttente || false,
      
      // Données structurelles
      catalogue: item.catalogue,
      famille: item.famille,
      annee: item.annee,
      
      // Données d'activité
      maxReservationParSemaine: item.maxReservationParSemaine,
      inscriptionAnnuelle: item.inscriptionAnnuelle,
      affichageOnly: item.affichageOnly || false,
      nbInscrits: item.nbInscrits,
      position: item.position,
      statutInscription: item.statutInscription,
      nbCreneaux: item.nbCreneaux,
      inscriptionEnCours: item.inscriptionEnCours,
      inscriptionAnnulable: item.inscriptionAnnulable,
      
      // Créneaux avec TOUTES les données
      creneaux: Array.isArray(item.creneaux) ? item.creneaux.map((c: any) => ({
        // ID réel du créneau
        id: c.id || '',
        
        // Horaires
        horaireDebut: c.horaireDebut || '',
        horaireFin: c.horaireFin || '',
        jour: c.jour || '',
        
        // Localisation complète
        localisation: c.localisation ? {
          id: c.localisation.id || '',
          nom: c.localisation.nom || '',
          adresse: c.localisation.adresse || '',
          ville: c.localisation.ville || '',
          codePostal: c.localisation.codePostal || '',
          complementAdresse: c.localisation.complementAdresse
        } : undefined,
        
        // Données de créneau
        quotaCursus: c.quotaCursus,
        quotaLoisir: c.quotaLoisir,
        quotaMinimum: c.quotaMinimum,
        niveau: c.niveau,
        fileAttente: c.fileAttente || false,
        quota: c.quota,
        nbMoyenInscrits: c.nbMoyenInscrits,
        nbInscrits: c.nbInscrits,
        nbMoyenPresents: c.nbMoyenPresents,
        
        // Encadrants
        encadrants: c.encadrants || [],
        encadrantsLibelle: c.encadrantsLibelle || '',
        
        // Autres données
        fermetures: c.fermetures || []
      })) : []
    }));

    return NextResponse.json({
      success: true,
      data: activites,
      count: activites.length
    });

  } catch (error) {
    // Erreur silencieuse pour la prod
    
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
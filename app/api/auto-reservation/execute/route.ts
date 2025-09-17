import { NextRequest, NextResponse } from 'next/server';
import { 
  getCreneauxAutoReservation,
  mettreAJourCreneauAutoReservation,
  enregistrerLogReservation,
  calculerProchaineReservation,
  disconnectDatabase
} from '@/utils/database';

// Configuration
const SUAPS_BASE_URL = process.env.SUAPS_BASE_URL || 'https://u-sport.univ-nantes.fr';

// Headers pour les requêtes SUAPS
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
  'Content-Type': 'application/json',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Priority': 'u=0'
};

/**
 * Effectue la connexion SUAPS avec un code carte
 */
async function loginSuaps(codeCarte: string) {
  try {
    console.log(`Tentative de connexion pour l'utilisateur ${codeCarte}`);
    
    const response = await fetch(`${SUAPS_BASE_URL}/api/auth/connexion`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        login: codeCarte,
        password: '' // Le système SUAPS utilise seulement le code carte
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extraire le token des cookies
    const cookies = response.headers.get('set-cookie');
    let accessToken = null;
    
    if (cookies) {
      const tokenMatch = cookies.match(/accessToken=([^;]+)/);
      if (tokenMatch) {
        accessToken = tokenMatch[1];
      }
    }

    if (!accessToken) {
      throw new Error('Token d\'accès non trouvé dans la réponse');
    }

    console.log(`Connexion réussie pour ${codeCarte}`);
    return { success: true, accessToken, userData: data };
    
  } catch (error: any) {
    console.error(`Erreur de connexion pour ${codeCarte}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Effectue une réservation de créneau
 */
async function reserverCreneau(accessToken: string, creneauData: any, userData: any) {
  try {
    console.log(`Tentative de réservation du créneau ${creneauData.creneauId} pour ${userData.login}`);
    
    // Construction de la requête de réservation basée sur l'exemple fourni
    const reservationData = {
      utilisateur: {
        login: userData.login,
        typeUtilisateur: userData.typeUtilisateur || 'EXTERNE'
      },
      dateReservation: new Date().toISOString(),
      actif: false,
      forcage: false,
      creneau: {
        id: creneauData.creneauId,
        codeCursus: null,
        jour: creneauData.jour,
        horaireDebut: creneauData.horaireDebut,
        horaireFin: creneauData.horaireFin,
        quotaCursus: null,
        quotaLoisir: 45, // Valeur par défaut, à ajuster
        quotaMinimum: null,
        niveau: 'Tous niveaux',
        fileAttente: false,
        activite: {
          id: creneauData.activiteId,
          nom: creneauData.activiteNom
        }
      },
      individuDTO: userData
    };

    const response = await fetch(`${SUAPS_BASE_URL}/api/extended/reservation-creneaux`, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': `accessToken=${accessToken}`
      },
      body: JSON.stringify(reservationData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    console.log(`Réservation réussie pour le créneau ${creneauData.creneauId}`);
    return { success: true, data: result };
    
  } catch (error: any) {
    console.error(`Erreur de réservation pour le créneau ${creneauData.creneauId}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Traite un créneau d'auto-réservation
 */
async function traiterCreneau(creneau: any, logs: string[]) {
  try {
    // Vérifier si c'est le bon moment pour réserver (7 jours glissants)
    const prochaineReservation = calculerProchaineReservation(creneau.jour);
    const maintenant = new Date();
    
    // Vérifier si on est dans la fenêtre de réservation (après 20h le jour J-7)
    const heureReservation = new Date(maintenant);
    heureReservation.setHours(20, 0, 0, 0); // 20h00:00
    
    const jourReservation = new Date(prochaineReservation);
    jourReservation.setDate(jourReservation.getDate() - 7); // 7 jours avant
    jourReservation.setHours(20, 0, 0, 0);
    
    if (maintenant < jourReservation) {
      const message = `Pas encore l'heure de réserver pour le créneau ${creneau.id} (${creneau.jour} ${creneau.horaireDebut})`;
      logs.push(message);
      console.log(message);
      return false;
    }
    
    // Vérifier si on a déjà essayé aujourd'hui
    const aujourdhui = maintenant.toISOString().split('T')[0];
    if (creneau.derniereTentative?.split('T')[0] === aujourdhui) {
      const message = `Tentative déjà effectuée aujourd'hui pour le créneau ${creneau.id}`;
      logs.push(message);
      console.log(message);
      return false;
    }

    // Tentative de connexion
    const authResult = await loginSuaps(creneau.userId);
    if (!authResult.success) {
      await enregistrerLogReservation({
        userId: creneau.userId,
        creneauAutoId: creneau.id,
        timestamp: new Date().toISOString(),
        statut: 'AUTH_ERROR',
        message: `Erreur d'authentification: ${authResult.error}`,
        details: { error: authResult.error }
      });
      
      await mettreAJourCreneauAutoReservation(creneau.id, {
        derniereTentative: new Date().toISOString(),
        nbTentatives: creneau.nbTentatives + 1
      });
      
      const message = `❌ Erreur d'authentification pour ${creneau.userId}: ${authResult.error}`;
      logs.push(message);
      console.error(message);
      return false;
    }

    // Tentative de réservation
    const reservationResult = await reserverCreneau(
      authResult.accessToken!,
      creneau,
      authResult.userData
    );

    // Mise à jour du créneau
    const updates: any = {
      derniereTentative: new Date().toISOString(),
      nbTentatives: creneau.nbTentatives + 1
    };

    let statut: 'SUCCESS' | 'FAILED' | 'AUTH_ERROR' | 'QUOTA_FULL' | 'NETWORK_ERROR' = 'FAILED';
    let message = 'Échec de la réservation';

    if (reservationResult.success) {
      updates.derniereReservation = new Date().toISOString();
      updates.nbReussites = creneau.nbReussites + 1;
      statut = 'SUCCESS';
      message = 'Réservation réussie';
      
      const successMessage = `✅ Réservation réussie pour ${creneau.userId} - ${creneau.activiteNom} ${creneau.jour} ${creneau.horaireDebut}`;
      logs.push(successMessage);
      console.log(successMessage);
    } else {
      message = `Échec: ${reservationResult.error}`;
      
      // Déterminer le type d'erreur
      if (reservationResult.error.includes('quota') || reservationResult.error.includes('complet')) {
        statut = 'QUOTA_FULL';
      } else if (reservationResult.error.includes('réseau') || reservationResult.error.includes('network')) {
        statut = 'NETWORK_ERROR';
      }
      
      const errorMessage = `❌ Échec de réservation pour ${creneau.userId} - ${creneau.activiteNom}: ${reservationResult.error}`;
      logs.push(errorMessage);
      console.error(errorMessage);
    }

    await mettreAJourCreneauAutoReservation(creneau.id, updates);
    
    await enregistrerLogReservation({
      userId: creneau.userId,
      creneauAutoId: creneau.id,
      timestamp: new Date().toISOString(),
      statut,
      message,
      details: reservationResult.data || { error: reservationResult.error }
    });

    return reservationResult.success;
    
  } catch (error: any) {
    const errorMessage = `Erreur lors du traitement du créneau ${creneau.id}: ${error.message}`;
    logs.push(errorMessage);
    console.error(errorMessage);
    
    try {
      await enregistrerLogReservation({
        userId: creneau.userId,
        creneauAutoId: creneau.id,
        timestamp: new Date().toISOString(),
        statut: 'FAILED',
        message: `Erreur système: ${error.message}`,
        details: { error: error.message, stack: error.stack }
      });
    } catch (logError) {
      console.error('Erreur lors de l\'enregistrement du log:', logError);
    }
    
    return false;
  }
}

/**
 * Endpoint pour exécuter l'auto-réservation
 * Accessible uniquement avec une clé d'autorisation
 */
export async function POST(request: NextRequest) {
  try {
    // Vérification de l'autorisation
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.AUTO_RESERVATION_SECRET;
    
    if (!expectedAuth || authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const logs: string[] = [];
    const startTime = new Date();
    
    logs.push(`🚀 Démarrage de l'auto-réservation SUAPS à ${startTime.toISOString()}`);
    console.log('🚀 Démarrage de l\'auto-réservation SUAPS');
    
    // Récupération des créneaux à traiter
    const creneaux = await getCreneauxAutoReservation();
    logs.push(`${creneaux.length} créneaux d'auto-réservation trouvés`);
    console.log(`${creneaux.length} créneaux d'auto-réservation trouvés`);
    
    if (creneaux.length === 0) {
      logs.push('Aucun créneau à traiter');
      return NextResponse.json({
        success: true,
        message: 'Aucun créneau à traiter',
        logs,
        summary: {
          nbReussites: 0,
          nbEchecs: 0,
          duration: Date.now() - startTime.getTime()
        }
      });
    }
    
    // Tri par priorité (si définie)
    creneaux.sort((a: any, b: any) => {
      const prioriteA = a.options?.priorite || 3;
      const prioriteB = b.options?.priorite || 3;
      return prioriteA - prioriteB; // 1 = plus prioritaire
    });
    
    let nbReussites = 0;
    let nbEchecs = 0;
    
    // Traitement séquentiel pour éviter de surcharger le serveur SUAPS
    for (const creneau of creneaux) {
      const resultat = await traiterCreneau(creneau, logs);
      
      if (resultat) {
        nbReussites++;
      } else {
        nbEchecs++;
      }
      
      // Pause entre les tentatives pour éviter d'être détecté comme un bot
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    }
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    const finalMessage = `✅ Auto-réservation terminée - Réussites: ${nbReussites}, Échecs: ${nbEchecs}, Durée: ${Math.round(duration / 1000)}s`;
    logs.push(finalMessage);
    console.log(finalMessage);
    
    return NextResponse.json({
      success: true,
      message: 'Auto-réservation exécutée avec succès',
      logs,
      summary: {
        nbReussites,
        nbEchecs,
        duration,
        nbCreneauxTraites: creneaux.length
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erreur fatale dans l\'auto-réservation:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de l\'exécution de l\'auto-réservation',
      details: error.message
    }, { status: 500 });
    
  } finally {
    // Fermer la connexion à la base de données
    await disconnectDatabase();
  }
}

// Endpoint GET pour vérifier le statut
export async function GET(request: NextRequest) {
  try {
    // Vérification de l'autorisation
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.AUTO_RESERVATION_SECRET;
    
    if (!expectedAuth || authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    return NextResponse.json({
      status: 'ready',
      message: 'Endpoint d\'auto-réservation opérationnel',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    }, { status: 500 });
  }
}

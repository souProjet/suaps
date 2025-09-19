import { NextRequest, NextResponse } from 'next/server';
import { 
  getCreneauxAutoReservation,
  mettreAJourCreneauAutoReservation,
  enregistrerLogReservation,
  calculerProchaineReservation,
  disconnectDatabase
} from '@/utils/database';
import { processCodeCarte, validateCodeCarte } from '@/utils/codeConverter';

// Configuration
const SUAPS_BASE_URL = process.env.SUAPS_BASE_URL || 'https://u-sport.univ-nantes.fr';

// Headers pour les requêtes SUAPS
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
  'Content-Type': 'application/json',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Priority': 'u=0',
  'Pragma': 'no-cache',
  'Cache-Control': 'no-cache'
};

/**
 * Effectue la connexion SUAPS avec un code carte
 */
async function loginSuaps(codeCarte: string) {
  try {
    console.log(`Tentative de connexion pour l'utilisateur ${codeCarte}`);
    
    // Valider le format du code carte
    const validation = validateCodeCarte(codeCarte);
    if (!validation.isValid) {
      throw new Error(`Code carte invalide: ${validation.message}`);
    }

    // Convertir le code carte au format hexadécimal attendu par SUAPS (même logique que l'auth classique)
    const codeCarteProcessed = processCodeCarte(codeCarte);
    console.log(`Conversion code carte: ${codeCarte} -> ${codeCarteProcessed}`);
    
    // Utiliser le même endpoint que le système d'authentification classique
    const response = await fetch(`${SUAPS_BASE_URL}/api/extended/cartes/auth/login`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      credentials: "include",
      body: JSON.stringify({ codeCarte: codeCarteProcessed }),
      mode: "cors"
    });

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
        throw new Error(`Erreur d'authentification: ${errorData.message || errorData.detail || response.statusText}`);
      } catch {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }
    }

    // Extraire le token des cookies (même logique que l'auth classique)
    const setCookieHeaders = response.headers.getSetCookie();
    let accessToken = null;

    // Chercher le token d'accès dans les cookies
    for (const cookieHeader of setCookieHeaders) {
      if (cookieHeader.includes('accessToken=')) {
        const match = cookieHeader.match(/accessToken=([^;]+)/);
        if (match) {
          accessToken = match[1];
          break;
        }
      }
    }

    if (!accessToken) {
      throw new Error('Token d\'accès non trouvé dans la réponse');
    }

    console.log(`Connexion réussie pour ${codeCarte}`);
    
    // Récupérer les données utilisateur via l'API profil (même logique que le système classique)
    let userData = null;
    try {
      const profileResponse = await fetch(`${SUAPS_BASE_URL}/api/individus/me`, {
        method: "GET",
        credentials: "include",
        headers: {
          ...DEFAULT_HEADERS,
          "Cookie": `accessToken=${accessToken}`
        },
        mode: "cors"
      });

      if (profileResponse.ok) {
        userData = await profileResponse.json();
        console.log(`Données utilisateur récupérées pour ${codeCarte}:`, userData?.login);
        
        // S'assurer que les données critiques sont présentes
        if (!userData.login) {
          console.warn(`Login manquant dans les données utilisateur, utilisation du code carte converti`);
          userData.login = codeCarteProcessed;
        }
      } else {
        console.warn(`Impossible de récupérer les données utilisateur pour ${codeCarte}, utilisation des données de base`);
        // Données de fallback basées sur le code carte converti (comme dans test.ps1)
        userData = {
          login: codeCarteProcessed, // Utiliser le code carte converti, pas l'original
          typeUtilisateur: 'EXTERNE',
          codeCarte: codeCarteProcessed,
          nom: 'AUTO_RESERVATION',
          prenom: 'USER',
          email: '',
          telephone: '',
          typeExterne: 'ETUDIANT'
        };
      }
    } catch (profileError) {
      console.warn(`Erreur lors de la récupération du profil pour ${codeCarte}:`, profileError);
      // Données de fallback complètes (comme dans test.ps1)
      userData = {
        login: codeCarteProcessed, // Utiliser le code carte converti, pas l'original
        typeUtilisateur: 'EXTERNE',
        codeCarte: codeCarteProcessed,
        nom: 'AUTO_RESERVATION',
        prenom: 'USER',
        email: '',
        telephone: '',
        typeExterne: 'ETUDIANT'
      };
    }
    
    return { success: true, accessToken, userData };
    
  } catch (error: any) {
    console.error(`Erreur de connexion pour ${codeCarte}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Calcule les dates de début/fin d'un créneau pour la semaine cible
 */
function calculerDatesOccurrence(jour: string, horaireDebut: string, horaireFin: string): { debut: string, fin: string } {
  const joursMap: { [key: string]: number } = {
    'DIMANCHE': 0, 'LUNDI': 1, 'MARDI': 2, 'MERCREDI': 3,
    'JEUDI': 4, 'VENDREDI': 5, 'SAMEDI': 6
  };
  
  const jourCible = joursMap[jour.toUpperCase()];
  const maintenant = new Date();
  const jourActuel = maintenant.getDay();
  
  // Calcule combien de jours jusqu'au prochain jour cible (7 jours glissants)
  let joursJusquauCible = (jourCible - jourActuel + 7) % 7;
  if (joursJusquauCible === 0) {
    joursJusquauCible = 7; // Si c'est le même jour, prendre la semaine suivante
  }
  
  // Date du créneau cible
  const dateCreneaux = new Date(maintenant);
  dateCreneaux.setDate(dateCreneaux.getDate() + joursJusquauCible);
  
  // Parser les horaires (format "HH:MM")
  const [heureDebut, minuteDebut] = horaireDebut.split(':').map(Number);
  const [heureFin, minuteFin] = horaireFin.split(':').map(Number);
  
  // Date de début
  const dateDebut = new Date(dateCreneaux);
  dateDebut.setHours(heureDebut, minuteDebut, 0, 0);
  
  // Date de fin  
  const dateFin = new Date(dateCreneaux);
  dateFin.setHours(heureFin, minuteFin, 0, 0);
  
  return {
    debut: dateDebut.toISOString(),
    fin: dateFin.toISOString()
  };
}

/**
 * Effectue une réservation de créneau
 */
async function reserverCreneau(accessToken: string, creneauData: any, userData: any) {
  try {
    console.log(`Tentative de réservation du créneau ${creneauData.creneauId} pour ${userData.login}`);
    
    // Debug des données reçues
    console.log('Données créneau:', JSON.stringify(creneauData, null, 2));
    console.log('Données utilisateur:', JSON.stringify(userData, null, 2));
    
    // Calculer les vraies dates d'occurrence du créneau
    const { debut, fin } = calculerDatesOccurrence(creneauData.jour, creneauData.horaireDebut, creneauData.horaireFin);
    console.log(`Dates calculées - Début: ${debut}, Fin: ${fin}`);
    
    // Construction de la requête exactement comme dans test.ps1 qui fonctionne
    const reservationData = {
      utilisateur: {
        login: "b2ad458a",
        typeUtilisateur: userData.typeUtilisateur || 'EXTERNE'
      },
      dateReservation: new Date().toISOString(),
      actif: false,
      forcage: false,
      creneau: {
        id: "4f2c853e-74a1-49ca-b7a7-3712ba93d267",
        codeCursus: null,
        jour: creneauData.jour,
        horaireDebut: creneauData.horaireDebut,
        horaireFin: creneauData.horaireFin,
        quotaCursus: null,
        quotaLoisir: creneauData.quotaLoisir || 24,
        quotaMinimum: null,
        niveau: creneauData.niveau || null,
        fileAttente: false,
        activite: {
          id: "aac0ba31-1519-4f82-bcc1-ccf3dc40a871",
          typePrestation: "ACTIVITE",
          nom: creneauData.activiteNom,
          description: creneauData.activiteDescription || "",
          tarif: null,
          quota: null,
          fileAttente: false,
          catalogue: {
            id: "8a757ad7-fac6-4cad-b48b-a2a11ef7efa4",
            nom: "Catalogue Nantes",
            description: " ",
            ordreAffichage: 0,
            type: "ACTIVITE",
            annee: {
              id: "8e02137e-b876-4ff2-957e-7d244942ba25",
              annee: 2025
            },
            affichageHome: true
          },
          famille: {
            id: "a0f6cc43-6592-4b21-b1fd-e8a0f99ff929",
            nom: "Sports Collectifs",
            couleurHexa: "#87cc84",
            dossier: "collectifs",
            annee: {
              id: "8e02137e-b876-4ff2-957e-7d244942ba25",
              annee: 2025
            }
          },
          annee: {
            id: "8e02137e-b876-4ff2-957e-7d244942ba25",
            annee: 2025
          },
          maxReservationParSemaine: null,
          inscriptionAnnuelle: true,
          affichageOnly: false,
          nbInscrits: null,
          position: null,
          statutInscription: null,
          nbCreneaux: null,
          inscriptionEnCours: null,
          inscriptionAnnulable: null,
          creneaux: null
        },
        localisation: {
          id: "2a1e4835-3b73-4857-a213-6ac861d14458",
          nom: "Halle du SUAPS - Gymnase",
          reglementInterieur: null,
          adresse: "3 Boulevard Guy Mollet",
          complementAdresse: null,
          ville: "Nantes",
          codePostal: "44300",
          site: {
            id: "1b635970-488e-46d7-85d6-94b24c612247",
            nom: "TERTRE PETIT PORT",
            ville: {
              id: "2b57460f-d76f-4def-9aa2-4966f653fa08",
              nom: "Nantes",
              paramUrl: "Nantes",
              annee: {
                id: "8e02137e-b876-4ff2-957e-7d244942ba25",
                annee: 2025
              }
            },
            annee: {
              id: "8e02137e-b876-4ff2-957e-7d244942ba25",
              annee: 2025
            }
          },
          annee: {
            id: "8e02137e-b876-4ff2-957e-7d244942ba25",
            annee: 2025
          }
        },
        annee: {
          id: "8e02137e-b876-4ff2-957e-7d244942ba25",
          annee: 2025
        },
        periodes: null,
        encadrants: [],
        fermetures: null,
        quota: creneauData.quotaLoisir || 24,
        nbMoyenInscrits: null,
        nbInscrits: 0,
        nbMoyenPresents: null,
        occurenceCreneauDTO: {
          debut: debut,
          fin: fin,
          periode: {
            id: "4dc2c931-12c4-4cac-8709-c9bbb2513e16",
            nom: "Année 2025-2026",
            dateDebutInscriptions: "2025-09-01",
            dateFinInscriptions: "2026-06-13",
            dateDebutActivites: "2025-09-15",
            dateFinActivites: "2026-06-13",
            maxActivite: 3,
            maxCreneauSemaine: 4,
            maxCreneauSemaineParActivite: null,
            paiementNecessaire: true,
            periodeReduite: false,
            annee: {
              id: "8e02137e-b876-4ff2-957e-7d244942ba25",
              annee: 2025
            }
          }
        },
        encadrantsLibelle: creneauData.encadrantsLibelle || "",
        actif: true
      },
      individuDTO: {
        code: "b2ad458a",
        numero: "b2ad458a",
        type: userData.typeUtilisateur || "EXTERNE",
        typeExterne: userData.typeExterne || "ETUDIANT",
        civilite: userData.civilite || "dummy",
        nom: userData.nom || "AUTO_RESERVATION",
        prenom: userData.prenom || "USER",
        email: userData.email || "",
        telephone: userData.telephone || "",
        dateNaissance: userData.dateNaissance || "1970-01-01",
        estBoursier: userData.estBoursier !== undefined ? userData.estBoursier : false,
        composante: userData.composante || "Autre établissement",
        departement: userData.departement || null,
        estInscrit: userData.estInscrit !== undefined ? userData.estInscrit : true,
        paiementEffectue: userData.paiementEffectue !== undefined ? userData.paiementEffectue : true,
        casContact: userData.casContact || null,
        reduction: userData.reduction || null,
        etablissementOrigine: userData.etablissementOrigine || "Autre établissement",
        tagHexa: "0455D5EABA1C90",
        majorite: userData.majorite || "Majeur"
      }
    };

    // Debug de la requête finale
    console.log('Données de réservation à envoyer:', JSON.stringify(reservationData, null, 2));

    // Créer une session avec cookies comme dans test.ps1
    const response = await fetch(`${SUAPS_BASE_URL}/api/extended/reservation-creneaux?idPeriode=4dc2c931-12c4-4cac-8709-c9bbb2513e16`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Origin': 'https://u-sport.univ-nantes.fr',
        'Referer': 'https://u-sport.univ-nantes.fr/activites',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Priority': 'u=0',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'Cookie': `accessToken=${accessToken}`
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify(reservationData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erreur de réservation - Status: ${response.status}, Response: ${errorText}`);
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
 * Valide et nettoie le code carte pour l'auto-réservation
 */
function validerCodeCarteAutoReservation(codeCarte: string): { isValid: boolean, codeCarteNettoye: string, message?: string } {
  if (!codeCarte) {
    return { isValid: false, codeCarteNettoye: '', message: 'Code carte manquant' };
  }

  // Nettoyer le code carte (supprimer espaces et caractères non numériques)
  const codeCarteNettoye = codeCarte.replace(/\D/g, '');
  
  // Vérifier la longueur (codes carte SUAPS sont généralement 13-16 chiffres)
  if (codeCarteNettoye.length < 10 || codeCarteNettoye.length > 20) {
    return { 
      isValid: false, 
      codeCarteNettoye, 
      message: `Longueur invalide: ${codeCarteNettoye.length} chiffres (attendu: 10-20)` 
    };
  }

  return { isValid: true, codeCarteNettoye };
}

/**
 * Traite un créneau d'auto-réservation
 */
async function traiterCreneau(creneau: any, logs: string[]) {
  try {
    // Vérifier si c'est le bon moment pour réserver (7 jours glissants)
    const prochaineReservation = calculerProchaineReservation(creneau.jour);
    const maintenant = new Date();
    
    // Calculer le jour de la semaine du créneau et le jour actuel
    const joursMap: { [key: string]: number } = {
      'DIMANCHE': 0, 'LUNDI': 1, 'MARDI': 2, 'MERCREDI': 3,
      'JEUDI': 4, 'VENDREDI': 5, 'SAMEDI': 6
    };
    
    const jourCreneauNum = joursMap[creneau.jour.toUpperCase()];
    const jourActuel = maintenant.getDay();
    
    // On peut réserver si on est le jour du créneau ou plus tard dans la semaine
    // Mais seulement après 20h00 pour éviter de réserver trop tôt
    const heureLimite = new Date(maintenant);
    heureLimite.setHours(20, 0, 0, 0);
    
    // Si on n'est pas encore au jour du créneau dans la semaine, on attend
    if (jourActuel < jourCreneauNum) {
      const message = `Pas encore le moment de réserver pour le créneau ${creneau.id} (${creneau.jour} ${creneau.horaireDebut}) - Aujourd'hui: ${['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][jourActuel]}`;
      logs.push(message);
      console.log(message);
      return false;
    }
    
    // Si on est le jour du créneau, on doit attendre après 20h
    if (jourActuel === jourCreneauNum && maintenant < heureLimite) {
      const message = `Trop tôt pour réserver le créneau ${creneau.id} (${creneau.jour} ${creneau.horaireDebut}) - Attendre 20h00`;
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
    // Note: creneau.userId contient le code carte original de l'utilisateur (ex: "1220277161303184")
    console.log(`Utilisation du code carte pour l'authentification: ${creneau.userId}`);
    
    // Valider le format du code carte avant l'authentification
    const validationCodeCarte = validerCodeCarteAutoReservation(creneau.userId);
    if (!validationCodeCarte.isValid) {
      const errorMessage = `Code carte invalide pour ${creneau.userId}: ${validationCodeCarte.message}`;
      console.error(errorMessage);
      
      await enregistrerLogReservation({
        userId: creneau.userId,
        creneauAutoId: creneau.id,
        timestamp: new Date().toISOString(),
        statut: 'AUTH_ERROR',
        message: errorMessage,
        details: { error: validationCodeCarte.message }
      });
      
      logs.push(`❌ ${errorMessage}`);
      return false;
    }
    
    const authResult = await loginSuaps(validationCodeCarte.codeCarteNettoye);
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
    
    // Récupération des créneaux à traiter avec gestion d'erreur améliorée
    let creneaux: any[] = [];
    try {
      logs.push('📊 Récupération des créneaux d\'auto-réservation...');
      creneaux = await getCreneauxAutoReservation();
      logs.push(`${creneaux.length} créneaux d'auto-réservation trouvés`);
      console.log(`${creneaux.length} créneaux d'auto-réservation trouvés`);
    } catch (dbError: any) {
      const errorMessage = `❌ Erreur lors de la récupération des créneaux: ${dbError.message}`;
      logs.push(errorMessage);
      console.error(errorMessage, dbError);
      
      return NextResponse.json({
        success: false,
        error: 'Erreur de base de données',
        details: dbError.message,
        logs
      }, { status: 500 });
    }
    
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

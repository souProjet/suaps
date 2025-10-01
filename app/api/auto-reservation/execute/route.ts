import { NextRequest, NextResponse } from 'next/server';
import { 
  getCreneauxAutoReservation,
  mettreAJourCreneauAutoReservation,
  enregistrerLogReservation,
  calculerProchaineReservation,
  peutReserverANouveau,
  disconnectDatabase
} from '@/utils/database';
import { processCodeCarte, validateCodeCarte } from '@/utils/codeConverter';

// Configuration du timeout Vercel (maximum 5 minutes en plan Hobby, 13+ minutes en Pro)
export const maxDuration = 300; // 5 minutes - ajustez selon votre plan Vercel

// Configuration
const SUAPS_BASE_URL = process.env.SUAPS_BASE_URL || 'https://u-sport.univ-nantes.fr';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

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
 * Envoie un message via webhook Discord
 */
async function envoyerNotificationDiscord(titre: string, description: string, couleur: number = 0x3498db, champs?: Array<{name: string, value: string, inline?: boolean}>) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('⚠️ Webhook Discord non configuré, notification ignorée');
    return;
  }

  try {
    const embed = {
      title: titre,
      description: description,
      color: couleur,
      timestamp: new Date().toISOString(),
      fields: champs || []
    };

    const payload = {
      embeds: [embed]
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('❌ Erreur envoi Discord:', response.status, response.statusText);
    } else {
      console.log('✅ Notification Discord envoyée');
    }
  } catch (error: any) {
    console.error('❌ Erreur notification Discord:', error.message);
  }
}

/**
 * Effectue la connexion SUAPS avec un code carte
 */
async function loginSuaps(codeCarte: string) {
  try {
    // Valider le format du code carte
    const validation = validateCodeCarte(codeCarte);
    if (!validation.isValid) {
      throw new Error(`Code carte invalide: ${validation.message}`);
    }

    // Convertir le code carte au format hexadécimal attendu par SUAPS (même logique que l'auth classique)
    const codeCarteProcessed = processCodeCarte(codeCarte);
    
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
        
        // S'assurer que les données critiques sont présentes
        if (!userData.login) {
          userData.login = codeCarteProcessed;
        }
      } else {
        // Données de fallback basées sur le code carte converti
        userData = {
          login: codeCarteProcessed,
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
      // Données de fallback complètes
      userData = {
        login: codeCarteProcessed,
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
    return { success: false, error: error.message };
  }
}

/**
 * Calcule les dates de début/fin d'un créneau pour la semaine cible
 * Utilise la nouvelle logique des 7 jours glissants
 */
async function calculerDatesOccurrence(jour: string, horaireDebut: string, horaireFin: string, creneau?: any): Promise<{ debut: string, fin: string }> {
  let dateCreneaux: Date;
  
  if (creneau) {
    // Utiliser la nouvelle logique si on a accès aux données du créneau
    const verificationReservation = await peutReserverANouveau(creneau);
    if (verificationReservation.prochaineDateReservation) {
      dateCreneaux = verificationReservation.prochaineDateReservation;
    } else {
      // Fallback sur l'ancienne logique
      dateCreneaux = calculerProchaineReservation(jour);
    }
  } else {
    // Fallback sur l'ancienne logique si pas de données de créneau
    dateCreneaux = calculerProchaineReservation(jour);
  }
  
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
    // Calculer les vraies dates d'occurrence du créneau
    const { debut, fin } = await calculerDatesOccurrence(creneauData.jour, creneauData.horaireDebut, creneauData.horaireFin, creneauData);
    
    // Construction de la requête avec les données dynamiques de la BDD
    const reservationData = {
      actif: false,
      creneau: {
        actif: true,
        activite: {
          affichageOnly: creneauData.activiteAffichageOnly || false,
          annee: creneauData.annee || {
            annee: 2025,
            id: "8e02137e-b876-4ff2-957e-7d244942ba25"
          },
          catalogue: creneauData.catalogue || {
            affichageHome: true,
            annee: {
              annee: 2025,
              id: "8e02137e-b876-4ff2-957e-7d244942ba25"
            },
            description: " ",
            id: "8a757ad7-fac6-4cad-b48b-a2a11ef7efa4",
            nom: "Catalogue Nantes",
            ordreAffichage: 0,
            type: "ACTIVITE"
          },
          creneaux: null,
          description: creneauData.activiteDescription || "",
          famille: creneauData.famille || {
            annee: {
              annee: 2025,
              id: "8e02137e-b876-4ff2-957e-7d244942ba25"
            },
            couleurHexa: "#87cc84",
            dossier: "collectifs",
            id: "a0f6cc43-6592-4b21-b1fd-e8a0f99ff929",
            nom: "Sports Collectifs"
          },
          fileAttente: creneauData.activiteFileAttente || false,
          id: creneauData.activiteId,
          inscriptionAnnuelle: creneauData.activiteInscriptionAnnuelle !== undefined ? creneauData.activiteInscriptionAnnuelle : true,
          inscriptionAnnulable: creneauData.activiteInscriptionAnnulable || null,
          inscriptionEnCours: creneauData.activiteInscriptionEnCours || null,
          maxReservationParSemaine: creneauData.activiteMaxReservationParSemaine || null,
          nbCreneaux: creneauData.activiteNbCreneaux || null,
          nbInscrits: creneauData.activiteNbInscrits || null,
          nom: creneauData.activiteNom,
          position: creneauData.activitePosition || null,
          quota: creneauData.activiteQuota || null,
          statutInscription: creneauData.activiteStatutInscription || null,
          tarif: creneauData.activiteTarif || null,
          typePrestation: "ACTIVITE"
        },
        annee: creneauData.annee || {
          annee: 2025,
          id: "8e02137e-b876-4ff2-957e-7d244942ba25"
        },
        codeCursus: creneauData.codeCursus || null,
        encadrants: creneauData.encadrants || [],
        encadrantsLibelle: creneauData.encadrantsLibelle || "",
        fermetures: creneauData.fermetures || null,
        fileAttente: creneauData.fileAttente || false,
        horaireDebut: creneauData.horaireDebut,
        horaireFin: creneauData.horaireFin,
        id: creneauData.creneauId,
        jour: creneauData.jour,
        localisation: creneauData.localisation || {
          adresse: "Adresse non définie",
          annee: {
            annee: 2025,
            id: "8e02137e-b876-4ff2-957e-7d244942ba25"
          },
          codePostal: null,
          complementAdresse: null,
          id: null,
          nom: "Localisation non définie",
          reglementInterieur: null,
          site: null,
          ville: "Ville non définie"
        },
        nbInscrits: creneauData.nbInscrits || 0,
        nbMoyenInscrits: creneauData.nbMoyenInscrits || null,
        nbMoyenPresents: creneauData.nbMoyenPresents || null,
        niveau: creneauData.niveau || null,
        occurenceCreneauDTO: {
          debut: debut.replace('.000Z', 'Z'), // Format sans millisecondes comme dans attendu.json
          fin: fin.replace('.000Z', 'Z'),
          periode: {
            annee: {
              annee: 2025,
              id: "8e02137e-b876-4ff2-957e-7d244942ba25"
            },
            dateDebutActivites: "2025-09-15",
            dateDebutInscriptions: "2025-09-01",
            dateFinActivites: "2026-06-13",
            dateFinInscriptions: "2026-06-13",
            id: process.env.SUAPS_PERIODE_ID || "4dc2c931-12c4-4cac-8709-c9bbb2513e16",
            maxActivite: 3,
            maxCreneauSemaine: 4,
            maxCreneauSemaineParActivite: null,
            nom: "Année 2025-2026",
            paiementNecessaire: true,
            periodeReduite: false
          }
        },
        periodes: creneauData.periodes || null,
        quota: creneauData.quota || creneauData.quotaLoisir || 24,
        quotaCursus: creneauData.quotaCursus || null,
        quotaLoisir: creneauData.quotaLoisir || 24,
        quotaMinimum: creneauData.quotaMinimum || null
      },
      dateReservation: new Date().toISOString(),
      forcage: false,
      individuDTO: {
        casContact: null,
        civilite: userData.civilite || "dummy",
        code: creneauData.userId,
        composante: userData.composante || "Autre établissement",
        dateNaissance: userData.dateNaissance || "1970-01-01",
        departement: userData.departement || null,
        email: userData.email || "",
        estBoursier: userData.estBoursier !== undefined ? userData.estBoursier : false,
        estInscrit: userData.estInscrit !== undefined ? userData.estInscrit : true,
        etablissementOrigine: userData.etablissementOrigine || "Autre établissement",
        majorite: userData.majorite || "Majeur",
        nom: userData.nom || "AUTO_RESERVATION",
        numero: creneauData.userId,
        paiementEffectue: userData.paiementEffectue !== undefined ? userData.paiementEffectue : true,
        prenom: userData.prenom || "USER",
        reduction: userData.reduction || null,
        tagHexa: processCodeCarte(creneauData.codeCarte),
        telephone: userData.telephone || "",
        type: userData.type || "EXTERNE",
        typeExterne: userData.typeExterne || "ETUDIANT"
      },
      utilisateur: {
        login: creneauData.userId,
        typeUtilisateur: userData.typeUtilisateur || "EXTERNE"
      }
    };


    // Créer une session avec cookies comme dans test.ps1
    const response = await fetch(`${SUAPS_BASE_URL}/api/extended/reservation-creneaux?idPeriode=${process.env.SUAPS_PERIODE_ID}`, {
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
      throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    return { success: true, data: result };
    
  } catch (error: any) {
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
    // Vérifier si c'est le bon moment pour réserver selon les nouvelles règles
    const verificationReservation = await peutReserverANouveau(creneau);
    
    if (!verificationReservation.peutReserver) {
      logs.push(`❌ ${creneau.activiteNom} - ${verificationReservation.message}`);
      return false;
    }
    
    logs.push(`✅ ${creneau.activiteNom} - ${verificationReservation.message}`);

    // Valider le format du code carte avant l'authentification
    const validationCodeCarte = validerCodeCarteAutoReservation(creneau.codeCarte);
    if (!validationCodeCarte.isValid) {
      const errorMessage = `Code carte invalide: ${validationCodeCarte.message}`;
      
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
      
      const message = `❌ Erreur d'authentification: ${authResult.error}`;
      logs.push(message);
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
      
      const successMessage = `✅ ${creneau.activiteNom} - ${creneau.jour} ${creneau.horaireDebut}`;
      logs.push(successMessage);
    } else {
      message = `Échec: ${reservationResult.error}`;
      
      // Déterminer le type d'erreur
      if (reservationResult.error.includes('quota') || reservationResult.error.includes('complet')) {
        statut = 'QUOTA_FULL';
      } else if (reservationResult.error.includes('réseau') || reservationResult.error.includes('network')) {
        statut = 'NETWORK_ERROR';
      }
      
      const errorMessage = `❌ ${creneau.activiteNom}: ${reservationResult.error}`;
      logs.push(errorMessage);
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
      const errorMessage = `Erreur créneau ${creneau.id}: ${error.message}`;
      logs.push(errorMessage);
    
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
      // Erreur silencieuse pour les logs
    }
    
    return false;
  }
}

/**
 * Calcule le délai en millisecondes jusqu'à la prochaine minute pile
 * Accepte l'heure française et convertit automatiquement vers UTC pour Vercel
 */
function calculerDelaiJusquaHeureExacte(targetHourFrench: number, targetMinuteFrench: number): number {
  // Conversion heure française vers UTC (France = UTC+2 en été, UTC+1 en hiver)
  // Pour simplifier, on utilise UTC+2 (heure d'été française)
  const targetHourUTC = (targetHourFrench - 2 + 24) % 24;
  const targetMinuteUTC = targetMinuteFrench;
  
  // Log de debug pour vérifier la conversion
  console.log(`🕐 Heure cible: ${targetHourFrench}h${targetMinuteFrench.toString().padStart(2, '0')} (FR)`);
  
  const maintenant = new Date();
  const heureActuelle = maintenant.getUTCHours();
  const minuteActuelle = maintenant.getUTCMinutes();
  const secondeActuelle = maintenant.getUTCSeconds();
  const millisecondActuelle = maintenant.getUTCMilliseconds();
  
  // Si on est exactement à l'heure et minute cible (en UTC), attendre jusqu'à la fin de cette minute
  if (heureActuelle === targetHourUTC && minuteActuelle === targetMinuteUTC) {
    const secondesRestantes = 60 - secondeActuelle;
    const millisecondesRestantes = 1000 - millisecondActuelle;
    return (secondesRestantes * 1000) + millisecondesRestantes;
  }
  
  // Si on est dans la minute qui suit, pas d'attente
  const minuteSuivante = targetMinuteUTC + 1;
  const heureSuivante = minuteSuivante >= 60 ? (targetHourUTC + 1) % 24 : targetHourUTC;
  const minuteNormalisee = minuteSuivante >= 60 ? 0 : minuteSuivante;
  
  if (heureActuelle === heureSuivante && minuteActuelle === minuteNormalisee) {
    return 0;
  }
  
  // Dans les autres cas, exécuter immédiatement (pour les tests ou autres cas)
  return 0;
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
    
    // Notification Discord de début
    await envoyerNotificationDiscord(
      "🚀 Auto-réservation SUAPS - Démarrage",
      `Lancement de l'auto-réservation à ${startTime.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}`,
      0x3498db // Bleu
    );
    
    // Calculer le délai jusqu'à l'heure exacte (heure française, conversion automatique vers UTC)
    const delaiJusquaHeureExacte = calculerDelaiJusquaHeureExacte(11, 22);
    
    if (delaiJusquaHeureExacte > 0) {
      const secondesAttente = Math.ceil(delaiJusquaHeureExacte / 1000);
      console.log(`⏰ Attente de ${secondesAttente}s jusqu'à l'heure exacte...`);
      logs.push(`⏰ Attente de ${secondesAttente}s jusqu'à l'heure exacte...`);
      
      // Attendre jusqu'à l'heure exacte
      await new Promise(resolve => setTimeout(resolve, delaiJusquaHeureExacte-1));
      
      const heureExacte = new Date();
      logs.push(`🎯 Exécution à ${heureExacte.toLocaleTimeString('fr-FR')} UTC (${heureExacte.getUTCSeconds()}s)`);
    } else {
      logs.push(`🚀 Exécution immédiate à ${startTime.toLocaleTimeString('fr-FR')}`);
    }
    
    // Récupération des créneaux à traiter avec gestion d'erreur améliorée
    let creneaux: any[] = [];
    try {
      creneaux = await getCreneauxAutoReservation();
      logs.push(`${creneaux.length} créneaux trouvés`);
    } catch (dbError: any) {
      const errorMessage = `❌ Erreur base de données: ${dbError.message}`;
      logs.push(errorMessage);
      
      // Notification Discord d'erreur de base de données
      await envoyerNotificationDiscord(
        "🗄️ Auto-réservation SUAPS - Erreur Base de Données",
        `Impossible d'accéder à la base de données`,
        0xe74c3c, // Rouge
        [
          { name: "❌ Erreur", value: dbError.message, inline: false },
          { name: "⏰ Timestamp", value: new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' }), inline: true }
        ]
      );
      
      return NextResponse.json({
        success: false,
        error: 'Erreur de base de données',
        details: dbError.message,
        logs
      }, { status: 500 });
    }
    
    if (creneaux.length === 0) {
      logs.push('Aucun créneau configuré');
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
    
    const finalMessage = `✅ Terminé: ${nbReussites} réussites, ${nbEchecs} échecs (${Math.round(duration / 1000)}s)`;
    logs.push(finalMessage);
    
    // Notification Discord de fin avec résumé
    const couleurFin = nbReussites > 0 ? 0x27ae60 : (nbEchecs > 0 ? 0xe74c3c : 0x95a5a6); // Vert si réussites, rouge si échecs, gris si aucun
    const champsResume = [
      { name: "✅ Réussites", value: nbReussites.toString(), inline: true },
      { name: "❌ Échecs", value: nbEchecs.toString(), inline: true },
      { name: "⏱️ Durée", value: `${Math.round(duration / 1000)}s`, inline: true },
      { name: "📊 Créneaux traités", value: creneaux.length.toString(), inline: true }
    ];
    
    // Ajouter les détails des erreurs si il y en a
    if (nbEchecs > 0) {
      const erreursDetails = logs
        .filter(log => log.startsWith('❌'))
        .slice(0, 5) // Limiter à 5 erreurs pour éviter un message trop long
        .join('\n');
      
      if (erreursDetails) {
        champsResume.push({ 
          name: "🔍 Détails des erreurs", 
          value: erreursDetails.length > 1000 ? erreursDetails.substring(0, 1000) + '...' : erreursDetails, 
          inline: false 
        });
      }
    }
    
    await envoyerNotificationDiscord(
      "🏁 Auto-réservation SUAPS - Terminée",
      `Exécution terminée à ${endTime.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}`,
      couleurFin,
      champsResume
    );
    
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
    // Notification Discord d'erreur critique
    await envoyerNotificationDiscord(
      "💥 Auto-réservation SUAPS - Erreur Critique",
      `Une erreur critique s'est produite lors de l'exécution de l'auto-réservation`,
      0xe74c3c, // Rouge
      [
        { name: "❌ Erreur", value: error.message || "Erreur inconnue", inline: false },
        { name: "⏰ Timestamp", value: new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' }), inline: true }
      ]
    );
    
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

import { NextRequest, NextResponse } from "next/server";
import {
  getCreneauxAutoReservation,
  mettreAJourCreneauAutoReservation,
  enregistrerLogReservation,
  calculerProchaineReservation,
  peutReserverANouveau,
  disconnectDatabase,
} from "@/utils/database";
import { processCodeCarte, validateCodeCarte } from "@/utils/codeConverter";

// Configuration du timeout Vercel (maximum 5 minutes en plan Hobby, 13+ minutes en Pro)
export const maxDuration = 300; // 5 minutes - ajustez selon votre plan Vercel

// Configuration
const SUAPS_BASE_URL =
  process.env.SUAPS_BASE_URL || "https://u-sport.univ-nantes.fr";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Headers pour les requêtes SUAPS
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
  "Content-Type": "application/json",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  Priority: "u=0",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
};

// Cible temporelle (heure française)
const HEURE_CIBLE_FR = 20; // ajuster si besoin
const MINUTE_CIBLE_FR = 0; // ajuster si besoin
const SECOND_CIBLE_FR = 0; // démarrer à la seconde précise

// Session cookie global pour réutilisation après login
let sessionCookies: string | null = null;

/**
 * Envoie un message via webhook Discord
 */
async function envoyerNotificationDiscord(
  titre: string,
  description: string,
  couleur: number = 0x3498db,
  champs?: Array<{ name: string; value: string; inline?: boolean }>
) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log("⚠️ Webhook Discord non configuré, notification ignorée");
    return;
  }

  try {
    const embed = {
      title: titre,
      description: description,
      color: couleur,
      timestamp: new Date().toISOString(),
      fields: champs || [],
    };

    const payload = {
      embeds: [embed],
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        "❌ Erreur envoi Discord:",
        response.status,
        response.statusText
      );
    } else {
      console.log("✅ Notification Discord envoyée");
    }
  } catch (error: any) {
    console.error("❌ Erreur notification Discord:", error.message);
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
      throw new Error(validation.message);
    }

    const code = processCodeCarte(codeCarte);

    // Login SUAPS
    const res = await fetch(`${SUAPS_BASE_URL}/api/extended/cartes/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codeCarte: code }),
    });

    if (!res.ok) {
      let txt: string | null = null;
      try { txt = await res.text(); } catch (_) { }
      throw new Error(`Login SUAPS failed${txt ? `: ${txt}` : ""}`);
    }

    // Récupérer les cookies de session
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      sessionCookies = setCookie;
    }

    // Récupérer quelques infos utilisateur (fallback minimal si indisponible)
    let userData: any = { login: code, nom: "AUTO_RESERVATION", prenom: "USER", typeUtilisateur: "EXTERNE" };
    try {
      const prof = await fetch(`${SUAPS_BASE_URL}/api/individus/me`, {
        method: "GET",
        headers: {
          ...DEFAULT_HEADERS,
          Cookie: sessionCookies || "",
        },
        credentials: "include",
        mode: "cors",
      });
      if (prof.ok) {
        const json = await prof.json();
        userData = { ...userData, ...json };
        if (!userData.login) userData.login = code;
      }
    } catch (e) {
      // fallback already set
    }

    return { success: true, sessionCookies, userData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Calcule les dates de début/fin d'un créneau pour la semaine cible
 * Utilise la nouvelle logique des 7 jours glissants
 */
async function calculerDatesOccurrence(
  jour: string,
  horaireDebut: string,
  horaireFin: string,
  creneau?: any
): Promise<{ debut: string; fin: string }> {
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
  const [heureDebut, minuteDebut] = horaireDebut.split(":").map(Number);
  const [heureFin, minuteFin] = horaireFin.split(":").map(Number);

  // Date de début
  const dateDebut = new Date(dateCreneaux);
  dateDebut.setHours(heureDebut, minuteDebut, 0, 0);

  // Date de fin
  const dateFin = new Date(dateCreneaux);
  dateFin.setHours(heureFin, minuteFin, 0, 0);

  return {
    debut: dateDebut.toISOString(),
    fin: dateFin.toISOString(),
  };
}

/**
 * Effectue une réservation de créneau
 */
async function reserverCreneau(creneau: any, userData: any) {
  const debutResa = new Date().toISOString();
  try {
    const { debut, fin } = await calculerDatesOccurrence(
      creneau.jour,
      creneau.horaireDebut,
      creneau.horaireFin,
      creneau
    );

    const reservationData = {
      actif: false,
      creneau: {
        actif: true,
        activite: {
          id: creneau.activiteId,
          nom: creneau.activiteNom,
          typePrestation: "ACTIVITE",
          inscriptionAnnuelle: true,
        },
        id: creneau.creneauId,
        jour: creneau.jour,
        horaireDebut: creneau.horaireDebut,
        horaireFin: creneau.horaireFin,
        quota: creneau.quota || creneau.quotaLoisir || 24,
        occurenceCreneauDTO: {
          debut: debut.replace(".000Z", "Z"),
          fin: fin.replace(".000Z", "Z"),
          periode: { id: process.env.SUAPS_PERIODE_ID || "4dc2c931-12c4-4cac-8709-c9bbb2513e16" },
        },
      },
      dateReservation: new Date().toISOString(),
      forcage: false,
      individuDTO: {
        nom: userData.nom || "AUTO_RESERVATION",
        prenom: userData.prenom || "USER",
        code: creneau.userId,
        numero: creneau.userId,
        tagHexa: processCodeCarte(creneau.codeCarte),
        type: userData.type || "EXTERNE",
        typeExterne: userData.typeExterne || "ETUDIANT",
        email: userData.email || "",
        telephone: userData.telephone || "",
        paiementEffectue: true,
        estInscrit: true,
      },
      utilisateur: {
        login: creneau.userId,
        typeUtilisateur: userData.typeUtilisateur || "EXTERNE",
      },
    };

    const res = await fetch(`${SUAPS_BASE_URL}/api/extended/reservation-creneaux?idPeriode=${process.env.SUAPS_PERIODE_ID}`, {
      method: "POST",
      headers: {
        "User-Agent": DEFAULT_HEADERS["User-Agent"],
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
        "Content-Type": "application/json",
        Cookie: sessionCookies || "",
        Origin: "https://u-sport.univ-nantes.fr",
        Referer: "https://u-sport.univ-nantes.fr/activites",
      },
      credentials: "include",
      mode: "cors",
      body: JSON.stringify(reservationData),
    });

    if (!res.ok) {
      const txt = await res.text();
      // Déterminer le type d'erreur
      let statut: "SUCCESS" | "FAILED" | "AUTH_ERROR" | "QUOTA_FULL" | "NETWORK_ERROR" = "FAILED";
      if (txt.includes("quota") || txt.includes("complet")) statut = "QUOTA_FULL";
      else if (txt.includes("réseau") || txt.includes("network")) statut = "NETWORK_ERROR";

      await mettreAJourCreneauAutoReservation(creneau.id, {
        derniereTentative: new Date().toISOString(),
        nbTentatives: (creneau.nbTentatives || 0) + 1,
      });

      await enregistrerLogReservation({
        userId: creneau.userId,
        creneauAutoId: creneau.id,
        timestamp: new Date().toISOString(),
        statut,
        message: `Réservation échouée: ${txt}`,
        details: { error: txt, statusCode: res.status },
      });

      throw new Error(`Réservation échouée: ${txt}`);
    }

    const result = await res.json();

    await mettreAJourCreneauAutoReservation(creneau.id, {
      derniereTentative: new Date().toISOString(),
      derniereReservation: new Date().toISOString(),
      nbTentatives: (creneau.nbTentatives || 0) + 1,
      nbReussites: (creneau.nbReussites || 0) + 1,
    });

    await enregistrerLogReservation({
      userId: creneau.userId,
      creneauAutoId: creneau.id,
      timestamp: new Date().toISOString(),
      statut: "SUCCESS",
      message: "Réservation réussie",
      details: result,
    });

    return result;
  } catch (error: any) {
    if (!error.message.includes("Réservation échouée:")) {
      await mettreAJourCreneauAutoReservation(creneau.id, {
        derniereTentative: new Date().toISOString(),
        nbTentatives: (creneau.nbTentatives || 0) + 1,
      });

      await enregistrerLogReservation({
        userId: creneau.userId,
        creneauAutoId: creneau.id,
        timestamp: new Date().toISOString(),
        statut: "NETWORK_ERROR",
        message: `Erreur système: ${error.message}`,
        details: { error: error.message, stack: error.stack },
      });
    }

    throw error;
  }
}

/**
 * Valide et nettoie le code carte pour l'auto-réservation
 */
function validerCodeCarteAutoReservation(codeCarte: string): {
  isValid: boolean;
  codeCarteNettoye: string;
  message?: string;
} {
  if (!codeCarte) {
    return {
      isValid: false,
      codeCarteNettoye: "",
      message: "Code carte manquant",
    };
  }

  // Nettoyer le code carte (supprimer espaces et caractères non numériques)
  const codeCarteNettoye = codeCarte.replace(/\D/g, "");

  // Vérifier la longueur (codes carte SUAPS sont généralement 13-16 chiffres)
  if (codeCarteNettoye.length < 10 || codeCarteNettoye.length > 20) {
    return {
      isValid: false,
      codeCarteNettoye,
      message: `Longueur invalide: ${codeCarteNettoye.length} chiffres (attendu: 10-20)`,
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
      logs.push(
        `❌ ${creneau.activiteNom} - ${verificationReservation.message}`
      );
      return false;
    }

    logs.push(`✅ ${creneau.activiteNom} - ${verificationReservation.message}`);

    // Valider le format du code carte avant l'authentification
    const validationCodeCarte = validerCodeCarteAutoReservation(
      creneau.codeCarte
    );
    if (!validationCodeCarte.isValid) {
      const errorMessage = `Code carte invalide: ${validationCodeCarte.message}`;

      await enregistrerLogReservation({
        userId: creneau.userId,
        creneauAutoId: creneau.id,
        timestamp: new Date().toISOString(),
        statut: "AUTH_ERROR",
        message: errorMessage,
        details: { error: validationCodeCarte.message },
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
        statut: "AUTH_ERROR",
        message: `Erreur d'authentification: ${authResult.error}`,
        details: { error: authResult.error },
      });

      await mettreAJourCreneauAutoReservation(creneau.id, {
        derniereTentative: new Date().toISOString(),
        nbTentatives: creneau.nbTentatives + 1,
      });

      const message = `❌ Erreur d'authentification: ${authResult.error}`;
      logs.push(message);
      return false;
    }

    // Tentative de réservation (nouvelle version parallellisable)
    const updates: any = {
      derniereTentative: new Date().toISOString(),
      nbTentatives: (creneau.nbTentatives || 0) + 1,
    };

    let statut: "SUCCESS" | "FAILED" | "AUTH_ERROR" | "QUOTA_FULL" | "NETWORK_ERROR" = "FAILED";
    let message = "Échec de la réservation";

    try {
      const result = await reserverCreneau(creneau, authResult.userData);
      updates.derniereReservation = new Date().toISOString();
      updates.nbReussites = (creneau.nbReussites || 0) + 1;
      statut = "SUCCESS";
      message = "Réservation réussie";
      const successMessage = `✅ ${creneau.activiteNom} - ${creneau.jour} ${creneau.horaireDebut}`;
      logs.push(successMessage);

      await mettreAJourCreneauAutoReservation(creneau.id, updates);

      await enregistrerLogReservation({
        userId: creneau.userId,
        creneauAutoId: creneau.id,
        timestamp: new Date().toISOString(),
        statut,
        message,
        details: result,
      });

      return true;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      message = `Échec: ${errMsg}`;

      if (errMsg.includes("quota") || errMsg.includes("complet")) {
        statut = "QUOTA_FULL";
      } else if (errMsg.includes("réseau") || errMsg.includes("network")) {
        statut = "NETWORK_ERROR";
      } else {
        statut = "FAILED";
      }

      const errorMessage = `❌ ${creneau.activiteNom}: ${errMsg}`;
      logs.push(errorMessage);

      await mettreAJourCreneauAutoReservation(creneau.id, updates);

      await enregistrerLogReservation({
        userId: creneau.userId,
        creneauAutoId: creneau.id,
        timestamp: new Date().toISOString(),
        statut,
        message,
        details: { error: errMsg },
      });

      return false;
    }
  } catch (error: any) {
    const errorMessage = `Erreur créneau ${creneau.id}: ${error.message}`;
    logs.push(errorMessage);

    try {
      await enregistrerLogReservation({
        userId: creneau.userId,
        creneauAutoId: creneau.id,
        timestamp: new Date().toISOString(),
        statut: "FAILED",
        message: `Erreur système: ${error.message}`,
        details: { error: error.message, stack: error.stack },
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
function calculerDelaiJusquaHeureExacte(
  targetHourFrench: number,
  targetMinuteFrench: number
): number {
  // Conversion heure française vers UTC (France = UTC+2 en été, UTC+1 en hiver)
  // Pour simplifier, on utilise UTC+2 (heure d'été française)
  const targetHourUTC = (targetHourFrench - 2 + 24) % 24;
  const targetMinuteUTC = targetMinuteFrench;

  // Log de debug pour vérifier la conversion
  console.log(
    `🕐 Heure cible: ${targetHourFrench}h${targetMinuteFrench
      .toString()
      .padStart(2, "0")} (FR)`
  );

  const maintenant = new Date();
  const heureActuelle = maintenant.getUTCHours();
  const minuteActuelle = maintenant.getUTCMinutes();
  const secondeActuelle = maintenant.getUTCSeconds();
  const millisecondActuelle = maintenant.getUTCMilliseconds();

  // Si on est exactement à l'heure et minute cible (en UTC), attendre jusqu'à la fin de cette minute
  if (heureActuelle === targetHourUTC && minuteActuelle === targetMinuteUTC) {
    const secondesRestantes = 60 - secondeActuelle;
    const millisecondesRestantes = 1000 - millisecondActuelle;
    return secondesRestantes * 1000 + millisecondesRestantes;
  }

  // Si on est dans la minute qui suit, pas d'attente
  const minuteSuivante = targetMinuteUTC + 1;
  const heureSuivante =
    minuteSuivante >= 60 ? (targetHourUTC + 1) % 24 : targetHourUTC;
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
export async function GET(request: NextRequest) {
  try {
    // Vérification de l'autorisation
    // const authHeader = request.headers.get("authorization");
    // const expectedAuth = process.env.AUTO_RESERVATION_SECRET;

    // if (!expectedAuth || authHeader !== `Bearer ${expectedAuth}`) {
    //   return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    // }

    const logs: string[] = [];
    const startTime = new Date();

    // Attente précise jusqu'à la cible en heure française (seconde précise)
    const now = new Date();
    const parisFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const nowParisStr = parisFormatter.format(now); // "HH:MM:SS"
    const [curH, curM, curS] = nowParisStr.split(":").map((v) => Number(v));

    logs.push(`🕐 Heure actuelle: ${String(curH).padStart(2,'0')}h${String(curM).padStart(2,'0')}:${String(curS).padStart(2,'0')} (Paris)`);
    logs.push(`🎯 Cible: ${HEURE_CIBLE_FR}h${String(MINUTE_CIBLE_FR).padStart(2,'0')}:${String(SECOND_CIBLE_FR).padStart(2,'0')} (Paris)`);

    // Si on est déjà exactement à la seconde cible, démarrer immédiatement
    if (curH === HEURE_CIBLE_FR && curM === MINUTE_CIBLE_FR && curS === SECOND_CIBLE_FR) {
      logs.push("🎯 HEURE EXACTE ATTEINTE - DÉMARRAGE !");
      await envoyerNotificationDiscord(
        "🚀 Auto-réservation SUAPS - Démarrage",
        `Lancement de l'auto-réservation à ${nowParisStr} (Europe/Paris)`,
        0x3498db
      );
    } else {
      logs.push(`⏰ Attente jusqu'à ${HEURE_CIBLE_FR}h${String(MINUTE_CIBLE_FR).padStart(2,'0')}:${String(SECOND_CIBLE_FR).padStart(2,'0')} (Paris)`);
      // Boucle fine: vérifie l'heure Paris toutes les 300-400ms jusqu'à atteindre la seconde précise
      await new Promise<void>((resolve) => {
        const check = () => {
          const nowLocal = new Date();
          const parts = parisFormatter.format(nowLocal).split(":").map((v) => Number(v));
          const [h, m, s] = parts;
          console.log(`🕐 ${String(h).padStart(2,'0')}h${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} (Paris)`);
          if (h === HEURE_CIBLE_FR && m === MINUTE_CIBLE_FR && s === SECOND_CIBLE_FR) {
            console.log("🎯 HEURE EXACTE ATTEINTE - DÉMARRAGE !");
            resolve();
          } else {
            setTimeout(check, 350);
          }
        };
        check();
      });

      const heureExacte = new Date();
      logs.push(`🎯 Exécution à ${heureExacte.toLocaleTimeString("fr-FR")} (Paris)`);
      await envoyerNotificationDiscord(
        "🚀 Auto-réservation SUAPS - Démarrage",
        `Lancement de l'auto-réservation à ${heureExacte.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" })}`,
        0x3498db
      );
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
          {
            name: "⏰ Timestamp",
            value: new Date().toLocaleTimeString("fr-FR", {
              timeZone: "Europe/Paris",
            }),
            inline: true,
          },
        ]
      );

      return NextResponse.json(
        {
          success: false,
          error: "Erreur de base de données",
          details: dbError.message,
          logs,
        },
        { status: 500 }
      );
    }

    if (creneaux.length === 0) {
      logs.push("Aucun créneau configuré");
      return NextResponse.json({
        success: true,
        message: "Aucun créneau à traiter",
        logs,
        summary: {
          nbReussites: 0,
          nbEchecs: 0,
          duration: Date.now() - startTime.getTime(),
        },
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

    // Filtrer les créneaux qui peuvent être réservés (selon la logique métier)
    const creneauxAExecuter: any[] = [];
    for (const c of creneaux) {
      try {
        const verification = await peutReserverANouveau(c);
        if (!verification.peutReserver) {
          logs.push(`❌ ${c.activiteNom} - ${verification.message}`);
          continue;
        }
        creneauxAExecuter.push(c);
      } catch (e: any) {
        logs.push(`❌ ${c.activiteNom} - erreur vérification: ${e.message}`);
      }
    }

    if (creneauxAExecuter.length === 0) {
      logs.push("Aucun créneau éligible à la réservation");
    }

    // Pré-login pour tous les users pour gagner du temps (séquentiel)
    for (const c of creneauxAExecuter) {
      try {
        // Valider le code carte
        const validation = validerCodeCarteAutoReservation(c.codeCarte);
        if (!validation.isValid) {
          await enregistrerLogReservation({
            userId: c.userId,
            creneauAutoId: c.id,
            timestamp: new Date().toISOString(),
            statut: "AUTH_ERROR",
            message: `Code carte invalide: ${validation.message}`,
            details: { error: validation.message },
          });
          logs.push(`❌ ${c.activiteNom} - Code carte invalide`);
          c.authError = true;
          continue;
        }

        const auth = await loginSuaps(validation.codeCarteNettoye);
        if (!auth.success) {
          await enregistrerLogReservation({
            userId: c.userId,
            creneauAutoId: c.id,
            timestamp: new Date().toISOString(),
            statut: "AUTH_ERROR",
            message: `Erreur d'authentification: ${auth.error}`,
            details: { error: auth.error },
          });

          await mettreAJourCreneauAutoReservation(c.id, {
            derniereTentative: new Date().toISOString(),
            nbTentatives: (c.nbTentatives || 0) + 1,
          });

          logs.push(`❌ ${c.activiteNom} - Erreur d'authentification: ${auth.error}`);
          c.authError = true;
          continue;
        }

        c.userData = auth.userData;
      } catch (e: any) {
        logs.push(`❌ ${c.activiteNom} - Erreur login: ${e.message}`);
        c.authError = true;
      }
    }

    // Réservations en parallèle (uniquement pour les créneaux sans erreur d'auth)
    const creneauxValides = creneauxAExecuter.filter((c) => !c.authError);
    const results = await Promise.allSettled(
      creneauxValides.map((c) =>
        reserverCreneau(c, c.userData)
          .then(() => `${c.activiteNom} réussi`)
          .catch((e) => `${c.activiteNom} failed: ${e.message}`)
      )
    );

    results.forEach((r) => {
      if (r.status === "fulfilled") {
        nbReussites++;
        (logs as string[]).push(r.value as string);
      } else {
        nbEchecs++;
        (logs as string[]).push((r as any).reason || "Reservation failed");
      }
    });

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const finalMessage = `✅ Terminé: ${nbReussites} réussites, ${nbEchecs} échecs (${Math.round(
      duration / 1000
    )}s)`;
    logs.push(finalMessage);

    // Notification Discord de fin avec résumé
    const couleurFin =
      nbReussites > 0 ? 0x27ae60 : nbEchecs > 0 ? 0xe74c3c : 0x95a5a6; // Vert si réussites, rouge si échecs, gris si aucun
    const champsResume = [
      { name: "✅ Réussites", value: nbReussites.toString(), inline: true },
      { name: "❌ Échecs", value: nbEchecs.toString(), inline: true },
      {
        name: "⏱️ Durée",
        value: `${Math.round(duration / 1000)}s`,
        inline: true,
      },
      {
        name: "📊 Créneaux traités",
        value: creneaux.length.toString(),
        inline: true,
      },
    ];

    // Ajouter les détails des erreurs si il y en a
    if (nbEchecs > 0) {
      const erreursDetails = logs
        .filter((log) => log.startsWith("❌"))
        .slice(0, 5) // Limiter à 5 erreurs pour éviter un message trop long
        .join("\n");

      if (erreursDetails) {
        champsResume.push({
          name: "🔍 Détails des erreurs",
          value:
            erreursDetails.length > 1000
              ? erreursDetails.substring(0, 1000) + "..."
              : erreursDetails,
          inline: false,
        });
      }
    }

    await envoyerNotificationDiscord(
      "🏁 Auto-réservation SUAPS - Terminée",
      `Exécution terminée à ${endTime.toLocaleTimeString("fr-FR", {
        timeZone: "Europe/Paris",
      })}`,
      couleurFin,
      champsResume
    );

    return NextResponse.json({
      success: true,
      message: "Auto-réservation exécutée avec succès",
      logs,
      summary: {
        nbReussites,
        nbEchecs,
        duration,
        nbCreneauxTraites: creneaux.length,
      },
    });
  } catch (error: any) {
    // Notification Discord d'erreur critique
    await envoyerNotificationDiscord(
      "💥 Auto-réservation SUAPS - Erreur Critique",
      `Une erreur critique s'est produite lors de l'exécution de l'auto-réservation`,
      0xe74c3c, // Rouge
      [
        {
          name: "❌ Erreur",
          value: error.message || "Erreur inconnue",
          inline: false,
        },
        {
          name: "⏰ Timestamp",
          value: new Date().toLocaleTimeString("fr-FR", {
            timeZone: "Europe/Paris",
          }),
          inline: true,
        },
      ]
    );

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l'exécution de l'auto-réservation",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    // Fermer la connexion à la base de données
    await disconnectDatabase();
  }
}
/*
// Endpoint GET pour vérifier le statut
export async function GET(request: NextRequest) {
  try {
    // Vérification de l'autorisation
    const authHeader = request.headers.get("authorization");
    const expectedAuth = process.env.AUTO_RESERVATION_SECRET;

    if (!expectedAuth || authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    return NextResponse.json({
      status: "ready",
      message: "Endpoint d'auto-réservation opérationnel",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
  */

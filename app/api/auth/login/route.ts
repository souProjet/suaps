import { NextRequest, NextResponse } from 'next/server';
import { AuthRequest, AuthError } from '@/types/suaps';
import { processCodeCarte, validateCodeCarte } from '@/utils/codeConverter';

export async function POST(request: NextRequest) {
  try {
    const body: AuthRequest = await request.json();
    const { codeCarte } = body;

    if (!codeCarte) {
      return NextResponse.json(
        { 
          error: 'Code carte requis',
          type: 'validation_error',
          title: 'Données manquantes',
          status: 400,
          detail: 'Le code carte est obligatoire',
          path: '/api/auth/login',
          message: 'Code carte manquant'
        },
        { status: 400 }
      );
    }

    // Valider le format du code carte
    const validation = validateCodeCarte(codeCarte);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: validation.message || 'Code carte invalide',
          type: 'validation_error',
          title: 'Format invalide',
          status: 400,
          detail: validation.message || 'Le format du code carte est invalide',
          path: '/api/auth/login',
          message: 'Code carte au format invalide'
        },
        { status: 400 }
      );
    }

    // Convertir le code carte au format hexadécimal attendu par SUAPS
    const codeCarteProcessed = processCodeCarte(codeCarte);
    
    console.log(`Conversion code carte: ${codeCarte} -> ${codeCarteProcessed}`);

    // Effectuer la requête de connexion vers l'API SUAPS
    const loginResponse = await fetch("https://u-sport.univ-nantes.fr/api/extended/cartes/auth/login", {
      method: "POST",
      credentials: "include",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
        "Content-Type": "application/json",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Priority": "u=0"
      },
      body: JSON.stringify({ codeCarte: codeCarteProcessed }),
      mode: "cors"
    });

    // Gérer les erreurs d'authentification
    if (!loginResponse.ok) {
      let errorData: AuthError;
      
      try {
        errorData = await loginResponse.json();
      } catch {
        errorData = {
          type: "https://www.jhipster.tech/problem/problem-with-message",
          title: "Erreur de connexion",
          status: loginResponse.status,
          detail: "Erreur lors de la connexion",
          path: "/api/auth/login",
          message: `Erreur HTTP ${loginResponse.status}`
        };
      }

      return NextResponse.json({ error: errorData }, { status: loginResponse.status });
    }

    // Extraire les cookies de la réponse
    const setCookieHeaders = loginResponse.headers.getSetCookie();
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
      return NextResponse.json(
        { 
          error: {
            type: "auth_error",
            title: "Token manquant",
            status: 500,
            detail: "Token d'accès non reçu",
            path: "/api/auth/login",
            message: "Token d'accès manquant dans la réponse"
          }
        },
        { status: 500 }
      );
    }

    // Créer la réponse avec le cookie d'authentification
    const response = NextResponse.json({ 
      success: true,
      accessToken,
      message: 'Connexion réussie'
    });

    // Définir le cookie d'authentification côté serveur
    response.cookies.set('suaps_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 jours
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Erreur lors de la connexion SUAPS:', error);
    
    return NextResponse.json(
      {
        error: {
          type: "server_error",
          title: "Erreur serveur",
          status: 500,
          detail: "Erreur interne du serveur",
          path: "/api/auth/login",
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      },
      { status: 500 }
    );
  }
}

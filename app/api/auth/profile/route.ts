import { NextRequest, NextResponse } from 'next/server';

// Ce route handler lit les cookies de la requête et doit donc être traité
// en mode dynamique par Next.js lors de la génération.
export const dynamic = 'force-dynamic';
import { UserProfile } from '@/types/suaps';

export async function GET(request: NextRequest) {
  try {
    // Récupérer le token depuis les cookies
    const accessToken = request.cookies.get('suaps_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { 
          error: {
            type: "auth_error",
            title: "Non authentifié",
            status: 401,
            detail: "Token d'accès manquant",
            path: "/api/auth/profile",
            message: "Authentification requise"
          }
        },
        { status: 401 }
      );
    }

    // Effectuer la requête vers l'API SUAPS pour récupérer le profil
    const profileResponse = await fetch("https://u-sport.univ-nantes.fr/api/individus/me", {
      method: "GET",
      credentials: "include",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Cookie": `accessToken=${accessToken}`
      },
      mode: "cors"
    });

    if (!profileResponse.ok) {
      let errorData;
      
      try {
        errorData = await profileResponse.json();
      } catch {
        errorData = {
          type: "profile_error",
          title: "Erreur profil",
          status: profileResponse.status,
          detail: "Impossible de récupérer le profil",
          path: "/api/auth/profile",
          message: `Erreur HTTP ${profileResponse.status}`
        };
      }

      return NextResponse.json({ error: errorData }, { status: profileResponse.status });
    }

    const profile: UserProfile = await profileResponse.json();

    return NextResponse.json(profile);

  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    
    return NextResponse.json(
      {
        error: {
          type: "server_error",
          title: "Erreur serveur",
          status: 500,
          detail: "Erreur interne du serveur",
          path: "/api/auth/profile",
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      },
      { status: 500 }
    );
  }
}

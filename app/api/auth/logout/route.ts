import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Créer la réponse de déconnexion
    const response = NextResponse.json({ 
      success: true,
      message: 'Déconnexion réussie'
    });

    // Supprimer le cookie d'authentification
    response.cookies.set('suaps_access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immédiatement
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    
    return NextResponse.json(
      {
        error: {
          type: "server_error",
          title: "Erreur serveur",
          status: 500,
          detail: "Erreur lors de la déconnexion",
          path: "/api/auth/logout",
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      },
      { status: 500 }
    );
  }
}

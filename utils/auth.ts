/**
 * Utilitaires pour l'authentification SUAPS
 */

import { AuthResult, UserProfile, StoredAuth, AuthError } from '@/types/suaps';

const STORAGE_KEYS = {
  AUTH_DATA: 'suaps_auth_data',
  REMEMBER_CODE: 'suaps_remember_code'
} as const;

// Durée de validité du token (30 jours comme dans la réponse)
const TOKEN_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 jours en millisecondes

/**
 * Effectue la connexion SUAPS avec le code carte
 */
export async function loginWithSuaps(codeCarte: string): Promise<AuthResult> {
  try {
    // Étape 1: Connexion avec le code carte
    const loginResponse = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ codeCarte })
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json().catch(() => null);
      return {
        success: false,
        error: errorData || {
          type: 'network_error',
          title: 'Erreur réseau',
          status: loginResponse.status,
          detail: 'Erreur lors de la connexion',
          path: '/api/auth/login',
          message: `Erreur HTTP ${loginResponse.status}`
        }
      };
    }

    // Étape 2: Récupération du profil utilisateur
    const profileResponse = await fetch('/api/auth/profile', {
      method: 'GET',
      credentials: 'include',
    });

    if (!profileResponse.ok) {
      return {
        success: false,
        error: {
          type: 'profile_error',
          title: 'Erreur profil',
          status: profileResponse.status,
          detail: 'Impossible de récupérer le profil utilisateur',
          path: '/api/auth/profile',
          message: `Erreur HTTP ${profileResponse.status}`
        }
      };
    }

    const loginData = await loginResponse.json();
    const profile: UserProfile = await profileResponse.json();

    // Sauvegarder les données d'authentification
    const authData: StoredAuth = {
      codeCarte,
      accessToken: loginData.accessToken,
      profile,
      expiresAt: Date.now() + TOKEN_DURATION,
      createdAt: Date.now()
    };

    saveAuthData(authData);

    return {
      success: true,
      accessToken: loginData.accessToken,
      profile
    };

  } catch (error) {
    console.error('Erreur lors de la connexion SUAPS:', error);
    return {
      success: false,
      error: {
        type: 'network_error',
        title: 'Erreur réseau',
        status: 0,
        detail: 'Impossible de se connecter au serveur SUAPS',
        path: '/api/auth/login',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    };
  }
}

/**
 * Vérifie si l'utilisateur est actuellement connecté
 */
export function isAuthenticated(): boolean {
  const authData = getAuthData();
  if (!authData) return false;

  // Vérifier si le token n'est pas expiré
  return Date.now() < authData.expiresAt;
}

/**
 * Récupère les données d'authentification stockées
 */
export function getAuthData(): StoredAuth | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTH_DATA);
    if (!stored) return null;

    const authData = JSON.parse(stored) as StoredAuth;

    // Vérifier si les données ne sont pas expirées
    if (Date.now() > authData.expiresAt) {
      clearAuthData();
      return null;
    }

    return authData;
  } catch (error) {
    console.warn('Erreur lors de la récupération des données d\'auth:', error);
    clearAuthData();
    return null;
  }
}

/**
 * Sauvegarde les données d'authentification
 */
export function saveAuthData(authData: StoredAuth): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_DATA, JSON.stringify(authData));
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde des données d\'auth:', error);
  }
}

/**
 * Efface les données d'authentification
 */
export function clearAuthData(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_DATA);
  } catch (error) {
    console.warn('Erreur lors de l\'effacement des données d\'auth:', error);
  }
}

/**
 * Déconnecte l'utilisateur
 */
export async function logout(): Promise<void> {
  try {
    // Appeler l'API de déconnexion si elle existe
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    }).catch(() => {
      // Ignorer les erreurs de l'API de déconnexion
    });
  } catch (error) {
    console.warn('Erreur lors de la déconnexion côté serveur:', error);
  }

  // Effacer les données locales
  clearAuthData();
}

/**
 * Récupère le profil utilisateur actuel
 */
export function getCurrentUser(): UserProfile | null {
  const authData = getAuthData();
  return authData?.profile || null;
}

/**
 * Récupère l'utilisateur authentifié côté serveur depuis les cookies
 */
export async function getCurrentUserFromRequest(request: Request): Promise<UserProfile | null> {
  try {
    // Récupérer le token depuis les cookies
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return null;
    }

    // Extraire le token d'accès
    const accessTokenMatch = cookieHeader.match(/suaps_access_token=([^;]+)/);
    if (!accessTokenMatch) {
      return null;
    }

    const accessToken = accessTokenMatch[1];

    // Effectuer la requête vers l'API SUAPS pour récupérer le profil
    const profileResponse = await fetch("https://u-sport.univ-nantes.fr/api/individus/me", {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
        "Cookie": `accessToken=${accessToken}`
      }
    });

    if (!profileResponse.ok) {
      return null;
    }

    const profile: UserProfile = await profileResponse.json();
    return profile;

  } catch (error) {
    console.error('Erreur lors de la récupération du profil depuis les cookies:', error);
    return null;
  }
}

/**
 * Sauvegarde le code carte pour se souvenir de l'utilisateur
 */
export function rememberCodeCarte(codeCarte: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_CODE, codeCarte);
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde du code carte:', error);
  }
}

/**
 * Récupère le code carte sauvegardé
 */
export function getRememberedCodeCarte(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(STORAGE_KEYS.REMEMBER_CODE);
  } catch (error) {
    console.warn('Erreur lors de la récupération du code carte:', error);
    return null;
  }
}

/**
 * Efface le code carte sauvegardé
 */
export function clearRememberedCodeCarte(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_CODE);
  } catch (error) {
    console.warn('Erreur lors de l\'effacement du code carte:', error);
  }
}

/**
 * Vérifie si le token est proche de l'expiration (moins de 2 jours)
 */
export function isTokenExpiringSoon(): boolean {
  const authData = getAuthData();
  if (!authData) return false;

  const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
  return (authData.expiresAt - Date.now()) < twoDaysInMs;
}

/**
 * Tente de renouveler automatiquement la session
 */
export async function renewSession(): Promise<boolean> {
  const authData = getAuthData();
  if (!authData) return false;

  try {
    const result = await loginWithSuaps(authData.codeCarte);
    return result.success;
  } catch (error) {
    console.warn('Erreur lors du renouvellement de session:', error);
    return false;
  }
}

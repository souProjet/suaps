'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  isAuthenticated, 
  getCurrentUser, 
  loginWithSuaps, 
  logout as logoutAuth,
  getAuthData,
  isTokenExpiringSoon,
  renewSession
} from '@/utils/auth';
import { UserProfile, AuthResult } from '@/types/suaps';

interface UseAuthReturn {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isTokenExpiring: boolean;
  login: (codeCarte: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshAuth: () => void;
  renewToken: () => Promise<boolean>;
}

/**
 * Hook pour gérer l'authentification SUAPS
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier l'authentification au montage et périodiquement
  const refreshAuth = useCallback(() => {
    try {
      if (isAuthenticated()) {
        const currentUser = getCurrentUser();
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification d\'authentification:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fonction de connexion
  const login = useCallback(async (codeCarte: string): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const result = await loginWithSuaps(codeCarte);
      if (result.success && result.profile) {
        setUser(result.profile);
      }
      return result;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return {
        success: false,
        error: {
          type: 'client_error',
          title: 'Erreur client',
          status: 0,
          detail: 'Erreur lors de la connexion',
          path: '/auth/login',
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fonction de déconnexion
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await logoutAuth();
      setUser(null);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fonction de renouvellement du token
  const renewToken = useCallback(async (): Promise<boolean> => {
    try {
      const success = await renewSession();
      if (success) {
        refreshAuth();
      }
      return success;
    } catch (error) {
      console.error('Erreur lors du renouvellement du token:', error);
      return false;
    }
  }, [refreshAuth]);

  // Vérifier l'authentification au montage
  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  // Vérifier périodiquement si le token va expirer
  useEffect(() => {
    const checkTokenExpiration = () => {
      if (user && isTokenExpiringSoon()) {
        // Optionnel: renouveler automatiquement le token
        // renewToken();
      }
    };

    // Vérifier toutes les heures
    const interval = setInterval(checkTokenExpiration, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, renewToken]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isTokenExpiring: user ? isTokenExpiringSoon() : false,
    login,
    logout,
    refreshAuth,
    renewToken
  };
}

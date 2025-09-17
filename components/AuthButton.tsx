'use client';

import React, { useState, useEffect } from 'react';
import { isAuthenticated, getCurrentUser } from '@/utils/auth';
import { UserProfile as UserProfileType, AuthResult } from '@/types/suaps';
import LoginForm from './LoginForm';
import { User, LogOut, ChevronDown } from 'lucide-react';

export default function AuthButton() {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<UserProfileType | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Vérifier l'authentification au montage du composant
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = () => {
    setIsCheckingAuth(true);
    try {
      if (isAuthenticated()) {
        const currentUser = getCurrentUser();
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
      setUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLoginSuccess = (result: AuthResult) => {
    if (result.success && result.profile) {
      setUser(result.profile);
      setShowLoginForm(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { logout } = await import('@/utils/auth');
      await logout();
      setUser(null);
      setShowUserMenu(false);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Affichage pendant la vérification de l'authentification
  if (isCheckingAuth) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600 hidden sm:inline">Vérification...</span>
      </div>
    );
  }

  // Si l'utilisateur est connecté, afficher le menu utilisateur compact
  if (user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors"
        >
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <User className="w-3 h-3" />
          </div>
          <span className="text-sm font-medium hidden sm:inline">
            {user.prenom}
          </span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {showUserMenu && (
          <>
            {/* Overlay pour fermer le menu */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowUserMenu(false)}
            />
            
            {/* Menu déroulant */}
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 font-semibold text-sm">
                      {user.prenom.charAt(0)}{user.nom.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {user.prenom} {user.nom}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-2">
                <div className="px-3 py-2 text-xs text-gray-500">
                  Code carte: <span className="font-mono">{user.code}</span>
                </div>
                <div className="flex flex-wrap gap-1 px-3 py-2">
                  {user.estInscrit && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Inscrit
                    </span>
                  )}
                  {user.paiementEffectue && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Payé
                    </span>
                  )}
                </div>
              </div>
              
              <div className="border-t border-gray-100 p-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Se déconnecter</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté, afficher le bouton de connexion
  return (
    <>
      <button
        onClick={() => setShowLoginForm(true)}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
      >
        <User className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Se connecter</span>
      </button>

      {showLoginForm && (
        <LoginForm
          onLoginSuccess={handleLoginSuccess}
          onCancel={() => setShowLoginForm(false)}
        />
      )}
    </>
  );
}

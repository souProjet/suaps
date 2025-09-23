'use client';

import React, { useState, useEffect } from 'react';
import { loginWithSuaps, getRememberedCodeCarte, rememberCodeCarte, clearRememberedCodeCarte } from '@/utils/auth';
import { validateCodeCarte, formatCodeCarteForDisplay, detectCodeCarteType } from '@/utils/codeConverter';
import { AuthResult } from '@/types/suaps';
import LoadingSpinner from './LoadingSpinner';

interface LoginFormProps {
  onLoginSuccess: (result: AuthResult) => void;
  onCancel?: () => void;
}

export default function LoginForm({ onLoginSuccess, onCancel }: LoginFormProps) {
  const [codeCarte, setCodeCarte] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeType, setCodeType] = useState<'numeric' | 'hex' | 'unknown'>('numeric');

  // Charger le code carte sauvegardé au montage du composant
  useEffect(() => {
    const rememberedCode = getRememberedCodeCarte();
    if (rememberedCode) {
      setCodeCarte(rememberedCode);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation côté client
    const validation = validateCodeCarte(codeCarte);
    if (!validation.isValid) {
      setError(validation.message || 'Code carte invalide');
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginWithSuaps(codeCarte);

      if (result.success) {
        // Gérer la mémorisation du code carte
        if (rememberMe) {
          rememberCodeCarte(codeCarte);
        } else {
          clearRememberedCodeCarte();
        }

        onLoginSuccess(result);
      } else {
        // Afficher l'erreur
        if (result.error?.detail === 'carteInvalide') {
          setError('Code carte invalide. Vérifiez votre numéro de carte SUAPS.');
        } else {
          setError(result.error?.detail || 'Erreur de connexion. Veuillez réessayer.');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      setError('Erreur de connexion. Vérifiez votre connexion internet et réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeCarteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '').toUpperCase(); // Supprimer les espaces et normaliser
    setCodeCarte(value);
    setError(null); // Effacer l'erreur quand l'utilisateur tape
    
    // Détecter le type de code pour l'affichage
    const type = detectCodeCarteType(value);
    setCodeType(type);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Connexion SUAPS</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="codeCarte" className="block text-sm font-medium text-gray-700 mb-2">
              Code carte SUAPS
            </label>
            <div className="relative">
              <input
                id="codeCarte"
                type="text"
                value={codeCarte}
                onChange={handleCodeCarteChange}
                placeholder="8 à 20 caractères"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-20"
                required
                disabled={isLoading}
                autoComplete="off"
              />
              {codeCarte && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    codeType === 'numeric' ? 'bg-blue-100 text-blue-700' :
                    codeType === 'hex' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {codeType === 'numeric' ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
                        OK
                      </>
                    ) : codeType === 'hex' ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                        OK
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                        ERR
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="rememberMe" className="block text-sm text-gray-700 font-medium">
                Se souvenir de mon code carte
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-6">
            <button
              type="submit"
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              disabled={isLoading || !codeCarte.trim()}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Connexion...</span>
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

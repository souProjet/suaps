/**
 * Hook pour gérer le cache des activités avec IndexedDB
 */

import { useState, useEffect, useCallback } from 'react';
import { ActiviteAPI } from '@/types/suaps';
import { IndexedDBUtils, CACHE_KEYS } from '@/utils/indexedDB';

interface UseActivitesCacheReturn {
  activites: ActiviteAPI[];
  loading: boolean;
  error: string | null;
  loadActivites: (catalogueId: string, forceRefresh?: boolean) => Promise<void>;
  clearCache: () => Promise<void>;
}

export function useActivitesCache(): UseActivitesCacheReturn {
  const [activites, setActivites] = useState<ActiviteAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialiser IndexedDB au montage
  useEffect(() => {
    IndexedDBUtils.init().catch(err => {
      console.warn('Impossible d\'initialiser IndexedDB:', err);
    });
  }, []);

  const loadActivites = useCallback(async (catalogueId: string, forceRefresh = false) => {
    if (!catalogueId) return;

    setLoading(true);
    setError(null);

    try {
      const cacheKey = CACHE_KEYS.ACTIVITES(catalogueId);
      
      // Essayer de récupérer depuis le cache si pas de refresh forcé
      if (!forceRefresh) {
        const cachedData = await IndexedDBUtils.getCache(cacheKey);
        if (cachedData) {
          console.log('📦 Données chargées depuis IndexedDB');
          setActivites(cachedData);
          setLoading(false);
          return;
        }
      }

      // Pas de cache ou refresh forcé, charger depuis l'API
      console.log('🌐 Chargement depuis l\'API SUAPS...');
      const response = await fetch(`/api/activites?catalogueId=${encodeURIComponent(catalogueId)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du chargement des données');
      }

      // Sauvegarder en cache
      try {
        await IndexedDBUtils.setCache(cacheKey, data.data);
        console.log('💾 Données sauvegardées dans IndexedDB');
      } catch (cacheError) {
        console.warn('Impossible de sauvegarder en cache:', cacheError);
        // Ne pas faire échouer si le cache échoue
      }

      setActivites(data.data);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('❌ Erreur lors du chargement des activités:', err);
      
      // En cas d'erreur réseau, essayer de charger depuis le cache même si expiré
      try {
        const cacheKey = CACHE_KEYS.ACTIVITES(catalogueId);
        const cachedData = await IndexedDBUtils.getCache(cacheKey);
        if (cachedData) {
          console.log('📦 Données de secours chargées depuis IndexedDB');
          setActivites(cachedData);
          setError('Données en cache (connexion limitée)');
        }
      } catch (cacheError) {
        console.warn('Impossible de charger depuis le cache:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await IndexedDBUtils.clearAllCache();
      console.log('🗑️ Cache IndexedDB effacé');
      setActivites([]);
    } catch (err) {
      console.error('Erreur lors de l\'effacement du cache:', err);
    }
  }, []);

  return {
    activites,
    loading,
    error,
    loadActivites,
    clearCache
  };
}

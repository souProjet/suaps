'use client';

import { useEffect } from 'react';
import { clearExpiredCache } from '@/utils/storage';
import { IndexedDBUtils } from '@/utils/indexedDB';

/**
 * Composant invisible qui gère le nettoyage automatique du cache
 * Se charge au démarrage de l'application
 */
export default function CacheManager() {
  useEffect(() => {
    const initAndCleanCache = async () => {
      try {
        // Initialiser IndexedDB
        await IndexedDBUtils.init();
        
        // Nettoyer les deux caches expirés
        clearExpiredCache(); // localStorage
        await IndexedDBUtils.clearExpiredCache(); // IndexedDB
        
        console.log('🧹 Cache nettoyé au démarrage');
      } catch (error) {
        console.warn('Erreur lors du nettoyage du cache:', error);
      }
    };

    // Nettoyer le cache au chargement de l'application
    initAndCleanCache();
    
    // Programmer un nettoyage périodique (toutes les 2 heures)
    const interval = setInterval(() => {
      initAndCleanCache();
    }, 2 * 60 * 60 * 1000); // 2 heures
    
    return () => clearInterval(interval);
  }, []);

  // Ce composant ne rend rien
  return null;
}

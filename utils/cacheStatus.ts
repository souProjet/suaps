/**
 * Utilitaires pour vérifier le statut du cache
 */

import { IndexedDBUtils } from './indexedDB';
import { getStorageSize } from './storage';

export interface CacheStatus {
  indexedDBAvailable: boolean;
  indexedDBSize: number;
  localStorageSize: number;
  totalSize: number;
}

/**
 * Obtient le statut complet du cache
 */
export async function getCacheStatus(): Promise<CacheStatus> {
  let indexedDBAvailable = false;
  let indexedDBSize = 0;
  
  try {
    await IndexedDBUtils.init();
    indexedDBSize = await IndexedDBUtils.getCacheSize();
    indexedDBAvailable = true;
  } catch (error) {
    console.warn('IndexedDB non disponible:', error);
  }

  const localStorageSize = getStorageSize();

  return {
    indexedDBAvailable,
    indexedDBSize,
    localStorageSize,
    totalSize: indexedDBSize + localStorageSize
  };
}

/**
 * Formate la taille en bytes en format lisible
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Nettoie tout le cache (localStorage + IndexedDB)
 */
export async function clearAllCache(): Promise<void> {
  try {
    // Nettoyer localStorage
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('suaps_')) {
          localStorage.removeItem(key);
        }
      }
    }
    
    // Nettoyer IndexedDB
    await IndexedDBUtils.clearAllCache();
    
    console.log('🗑️ Tout le cache a été effacé');
  } catch (error) {
    console.error('Erreur lors de l\'effacement du cache:', error);
    throw error;
  }
}

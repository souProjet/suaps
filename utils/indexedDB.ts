/**
 * Utilitaires pour IndexedDB - Cache local pour les données volumineuses SUAPS
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

const DB_NAME = 'SuapsCache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 semaine

class IndexedDBCache {
  private db: IDBDatabase | null = null;

  /**
   * Initialise la base de données IndexedDB
   */
  async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Erreur lors de l\'ouverture d\'IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Créer le store s'il n'existe pas
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Sauvegarde des données dans IndexedDB
   */
  async set(key: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('IndexedDB non disponible');

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const cacheEntry: CacheEntry & { key: string } = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cacheEntry);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Récupère des données depuis IndexedDB
   */
  async get(key: string): Promise<any | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    const transaction = this.db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        
        if (!result) {
          resolve(null);
          return;
        }

        // Vérifier si le cache n'est pas expiré
        if (Date.now() > result.expiresAt) {
          // Cache expiré, le supprimer
          this.delete(key).catch(console.error);
          resolve(null);
          return;
        }

        resolve(result.data);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Supprime une entrée du cache
   */
  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Efface tout le cache expiré
   */
  async clearExpired(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const entry = cursor.value as CacheEntry & { key: string };
          
          if (Date.now() > entry.expiresAt) {
            cursor.delete();
          }
          
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Efface tout le cache
   */
  async clear(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtient la taille approximative du cache
   */
  async getSize(): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) return 0;

    const transaction = this.db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Instance singleton
const indexedDBCache = new IndexedDBCache();

/**
 * API publique simplifiée
 */
export const IndexedDBUtils = {
  /**
   * Initialise IndexedDB
   */
  init: () => indexedDBCache.init(),

  /**
   * Sauvegarde des données volumineuses
   */
  setCache: (key: string, data: any) => indexedDBCache.set(key, data),

  /**
   * Récupère des données volumineuses
   */
  getCache: (key: string) => indexedDBCache.get(key),

  /**
   * Supprime une entrée du cache
   */
  deleteCache: (key: string) => indexedDBCache.delete(key),

  /**
   * Efface le cache expiré
   */
  clearExpiredCache: () => indexedDBCache.clearExpired(),

  /**
   * Efface tout le cache
   */
  clearAllCache: () => indexedDBCache.clear(),

  /**
   * Obtient la taille du cache
   */
  getCacheSize: () => indexedDBCache.getSize()
};

// Clés de cache prédéfinies
export const CACHE_KEYS = {
  ACTIVITES: (catalogueId: string) => `activites_${catalogueId}`,
  CATALOGUES: 'catalogues',
  USER_PROFILE: (userId: string) => `profile_${userId}`
} as const;

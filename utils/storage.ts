/**
 * Utilitaires pour la gestion du localStorage et du cache
 */

const STORAGE_KEYS = {
  USER_PREFERENCES: 'suaps_user_preferences',
  ACTIVITES_CACHE: 'suaps_activites_cache',
  CATALOGUES_CACHE: 'suaps_catalogues_cache',
  AUTH_DATA: 'suaps_auth_data',
  REMEMBER_CODE: 'suaps_remember_code'
} as const;

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 semaine en millisecondes

export interface UserPreferences {
  selectedCatalogueId?: string;
  contraintesHoraires?: any;
  activitesSelectionnees?: string[];
  creneauxSelectionnes?: any[];
  selectionMode?: string;
  currentStep?: number;
  lastUpdated: number;
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Sauvegarde les préférences utilisateur dans le localStorage
 */
export function saveUserPreferences(preferences: Partial<UserPreferences>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const currentPrefs = getUserPreferences();
    const updatedPrefs: UserPreferences = {
      ...currentPrefs,
      ...preferences,
      lastUpdated: Date.now()
    };
    
    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updatedPrefs));
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde des préférences:', error);
  }
}

/**
 * Récupère les préférences utilisateur depuis le localStorage
 */
export function getUserPreferences(): UserPreferences | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    if (!stored) return null;
    
    const preferences = JSON.parse(stored) as UserPreferences;
    
    // Vérifier si les préférences ne sont pas trop anciennes (plus de 30 jours)
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
    if (Date.now() - preferences.lastUpdated > maxAge) {
      clearUserPreferences();
      return null;
    }
    
    return preferences;
  } catch (error) {
    console.warn('Erreur lors de la récupération des préférences:', error);
    return null;
  }
}

/**
 * Efface les préférences utilisateur
 */
export function clearUserPreferences(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
  } catch (error) {
    console.warn('Erreur lors de l\'effacement des préférences:', error);
  }
}

/**
 * Sauvegarde des données en cache avec expiration
 */
export function saveToCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION
    };
    
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde en cache:', error);
  }
}

/**
 * Récupère des données depuis le cache
 */
export function getFromCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const cacheItem = JSON.parse(stored) as CacheItem<T>;
    
    // Vérifier si le cache n'est pas expiré
    if (Date.now() > cacheItem.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    
    return cacheItem.data;
  } catch (error) {
    console.warn('Erreur lors de la récupération depuis le cache:', error);
    return null;
  }
}

/**
 * Efface un élément du cache
 */
export function clearFromCache(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Erreur lors de l\'effacement du cache:', error);
  }
}

/**
 * Efface tout le cache expiré
 */
export function clearExpiredCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('suaps_') && key.includes('_cache')) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const cacheItem = JSON.parse(stored);
            if (cacheItem.expiresAt && Date.now() > cacheItem.expiresAt) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // Si on ne peut pas parser l'item, on le supprime
          localStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.warn('Erreur lors du nettoyage du cache:', error);
  }
}

/**
 * Obtient la taille approximative du localStorage utilisé
 */
export function getStorageSize(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length;
      }
    }
    return total;
  } catch (error) {
    console.warn('Erreur lors du calcul de la taille du storage:', error);
    return 0;
  }
}

// Constantes exportées pour utilisation dans les composants
export { STORAGE_KEYS };

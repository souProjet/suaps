/**
 * Hook personnalisé pour gérer les préférences utilisateur avec persistance
 */

import { useState, useEffect, useCallback } from 'react';
import { ContraintesHoraires, CreneauSelectionne, SelectionMode } from '@/types/suaps';
import { 
  getUserPreferences, 
  saveUserPreferences, 
  clearUserPreferences,
  clearExpiredCache,
  UserPreferences 
} from '@/utils/storage';

export interface UseUserPreferencesReturn {
  // État
  selectedCatalogueId: string | null;
  contraintesHoraires: ContraintesHoraires;
  activitesSelectionnees: string[];
  creneauxSelectionnes: CreneauSelectionne[];
  selectionMode: SelectionMode;
  currentStep: number;
  
  // Actions
  setSelectedCatalogueId: (id: string | null) => void;
  setContraintesHoraires: (contraintes: ContraintesHoraires) => void;
  setActivitesSelectionnees: (activites: string[]) => void;
  setCreneauxSelectionnes: (creneaux: CreneauSelectionne[]) => void;
  setSelectionMode: (mode: SelectionMode) => void;
  setCurrentStep: (step: number) => void;
  
  // Utilitaires
  clearAllPreferences: () => void;
  hasStoredPreferences: boolean;
}

const createDefaultContraintes = (): ContraintesHoraires => {
  const contraintes: ContraintesHoraires = {};
  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  jours.forEach(jour => {
    contraintes[jour] = { jour, actif: false };
  });
  return contraintes;
};

export function useUserPreferences(): UseUserPreferencesReturn {
  // États initiaux avec valeurs par défaut
  const [selectedCatalogueId, setSelectedCatalogueIdState] = useState<string | null>(null);
  const [contraintesHoraires, setContraintesHorairesState] = useState<ContraintesHoraires>(createDefaultContraintes);
  const [activitesSelectionnees, setActivitesSelectionneesState] = useState<string[]>([]);
  const [creneauxSelectionnes, setCreneauxSelectionnesState] = useState<CreneauSelectionne[]>([]);
  const [selectionMode, setSelectionModeState] = useState<SelectionMode>('sports');
  const [currentStep, setCurrentStepState] = useState<number>(1);
  const [hasStoredPreferences, setHasStoredPreferences] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Charger les préférences depuis le localStorage au montage
  useEffect(() => {
    if (typeof window === 'undefined' || isLoaded) return;

    // Nettoyer le cache expiré
    clearExpiredCache();

    const storedPrefs = getUserPreferences();
    
    if (storedPrefs) {
      setHasStoredPreferences(true);
      
      // Restaurer les préférences
      if (storedPrefs.selectedCatalogueId) {
        setSelectedCatalogueIdState(storedPrefs.selectedCatalogueId);
      }
      
      if (storedPrefs.contraintesHoraires) {
        setContraintesHorairesState(storedPrefs.contraintesHoraires);
      }
      
      if (storedPrefs.activitesSelectionnees) {
        setActivitesSelectionneesState(storedPrefs.activitesSelectionnees);
      }
      
      if (storedPrefs.creneauxSelectionnes) {
        setCreneauxSelectionnesState(storedPrefs.creneauxSelectionnes);
      }
      
      if (storedPrefs.selectionMode) {
        setSelectionModeState(storedPrefs.selectionMode as SelectionMode);
      }
      
      if (storedPrefs.currentStep) {
        setCurrentStepState(storedPrefs.currentStep);
      }
    }
    
    setIsLoaded(true);
  }, [isLoaded]);

  // Wrappers qui sauvegardent automatiquement
  const setSelectedCatalogueId = useCallback((id: string | null) => {
    setSelectedCatalogueIdState(id);
    if (isLoaded) {
      saveUserPreferences({ selectedCatalogueId: id || undefined });
    }
  }, [isLoaded]);

  const setContraintesHoraires = useCallback((contraintes: ContraintesHoraires) => {
    setContraintesHorairesState(contraintes);
    if (isLoaded) {
      saveUserPreferences({ contraintesHoraires: contraintes });
    }
  }, [isLoaded]);

  const setActivitesSelectionnees = useCallback((activites: string[]) => {
    setActivitesSelectionneesState(activites);
    if (isLoaded) {
      saveUserPreferences({ activitesSelectionnees: activites });
    }
  }, [isLoaded]);

  const setCreneauxSelectionnes = useCallback((creneaux: CreneauSelectionne[]) => {
    setCreneauxSelectionnesState(creneaux);
    if (isLoaded) {
      saveUserPreferences({ creneauxSelectionnes: creneaux });
    }
  }, [isLoaded]);

  const setSelectionMode = useCallback((mode: SelectionMode) => {
    setSelectionModeState(mode);
    if (isLoaded) {
      saveUserPreferences({ selectionMode: mode });
    }
  }, [isLoaded]);

  const setCurrentStep = useCallback((step: number) => {
    setCurrentStepState(step);
    if (isLoaded) {
      saveUserPreferences({ currentStep: step });
    }
  }, [isLoaded]);

  const clearAllPreferences = useCallback(() => {
    clearUserPreferences();
    setSelectedCatalogueIdState(null);
    setContraintesHorairesState(createDefaultContraintes());
    setActivitesSelectionneesState([]);
    setCreneauxSelectionnesState([]);
    setSelectionModeState('sports');
    setCurrentStepState(1);
    setHasStoredPreferences(false);
  }, []);

  return {
    // État
    selectedCatalogueId,
    contraintesHoraires,
    activitesSelectionnees,
    creneauxSelectionnes,
    selectionMode,
    currentStep,
    
    // Actions
    setSelectedCatalogueId,
    setContraintesHoraires,
    setActivitesSelectionnees,
    setCreneauxSelectionnes,
    setSelectionMode,
    setCurrentStep,
    
    // Utilitaires
    clearAllPreferences,
    hasStoredPreferences
  };
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { ActiviteAPI, ActiviteOption, Creneau, CreneauSelectionne } from '@/types/suaps';
import { useActivitesCache } from '@/hooks/useActivitesCache';
import { 
  extractCreneaux, 
  getActivitesDisponibles, 
  trouverCombinaisons,
  filtrerActivitesParContraintes
} from '@/utils/suaps';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import ActivitySelector from '@/components/ActivitySelector';
import CreneauxResults from '@/components/CreneauxResults';
import SelectionModeToggle from '@/components/SelectionModeToggle';
import CreneauxSelector from '@/components/CreneauxSelector';
import HoraireConstraints from '@/components/HoraireConstraints';
import CitySelector from '@/components/CitySelector';
import StepIndicator from '@/components/StepIndicator';
import StepContainer from '@/components/StepContainer';
import AuthButton from '@/components/AuthButton';
import AutoReservationHistory from '@/components/AutoReservationHistory';
import AutoReservationManager from '@/components/AutoReservationManager';
import { RefreshCw, Calendar, MapPin, Clock, Search, Target, RotateCcw, History, Bot } from 'lucide-react';
import { getCurrentUser } from '@/utils/auth';

// Fonction pour vérifier la compatibilité entre créneaux sélectionnés
function verifierCompatibiliteCreneaux(creneauxSelectionnes: CreneauSelectionne[]): {
  compatibles: Creneau[][];
  totalCombinaisons: number;
} {
  // Convertir les créneaux sélectionnés en format Creneau en préservant les données complètes
  const creneaux: Creneau[] = creneauxSelectionnes.map(creneau => ({
    activité: creneau.activite,
    jour: creneau.jour,
    début: creneau.debut,
    fin: creneau.fin,
    localisation: creneau.localisation,
    // Préserver les données complètes pour l'auto-réservation
    activiteId: creneau.activiteId || '',
    creneauId: creneau.creneauId || '',
    activiteData: creneau.activiteData,
    creneauData: creneau.creneauData
  }));

  // Vérifier s'il y a des conflits horaires
  const sontCompatibles = (c1: Creneau, c2: Creneau): boolean => {
    // Si différents jours, toujours compatible
    if (c1.jour !== c2.jour) return true;
    
    // Même jour, vérifier les heures
    const debut1 = c1.début;
    const fin1 = c1.fin;
    const debut2 = c2.début;
    const fin2 = c2.fin;
    
    // Pas de chevauchement si l'un finit quand l'autre commence ou vice versa
    return fin1 <= debut2 || fin2 <= debut1;
  };

  // Vérifier si tous les créneaux sont compatibles entre eux
  for (let i = 0; i < creneaux.length; i++) {
    for (let j = i + 1; j < creneaux.length; j++) {
      if (!sontCompatibles(creneaux[i], creneaux[j])) {
        // Il y a un conflit
        return { compatibles: [], totalCombinaisons: 1 };
      }
    }
  }

  // Tous les créneaux sont compatibles
  return { 
    compatibles: [creneaux], 
    totalCombinaisons: 1 
  };
}

export default function HomePage() {
  // État pour l'onglet actuel (recherche, auto-réservation, historique)
  const [activeTab, setActiveTab] = useState<'search' | 'auto-reservation' | 'history'>('search');
  
  // Utilisateur connecté pour les fonctionnalités auto-réservation
  const user = getCurrentUser();

  // Utilisation du hook pour la persistance des préférences
  const {
    selectedCatalogueId,
    contraintesHoraires,
    activitesSelectionnees,
    creneauxSelectionnes,
    selectionMode,
    currentStep,
    setSelectedCatalogueId,
    setContraintesHoraires,
    setActivitesSelectionnees,
    setCreneauxSelectionnes,
    setSelectionMode,
    setCurrentStep,
    clearAllPreferences,
    hasStoredPreferences
  } = useUserPreferences();

  // Utilisation du hook de cache pour les activités
  const { 
    activites: activitesAPI, 
    loading, 
    error, 
    loadActivites, 
    clearCache 
  } = useActivitesCache();

  // Configuration des étapes
  const steps = [
    {
      id: 1,
      title: "Campus",
      description: "Sélection du site",
      icon: <MapPin className="w-3 h-3 text-blue-500" />,
      completed: !!selectedCatalogueId,
      current: currentStep === 1
    },
    {
      id: 2,
      title: "Horaires",
      description: "Créneaux préférés",
      icon: <Clock className="w-3 h-3 text-blue-500" />,
      completed: currentStep > 2,
      current: currentStep === 2
    },
    {
      id: 3,
      title: selectionMode === 'sports' ? "Sports" : "Créneaux",
      description: selectionMode === 'sports' ? "Choix des activités" : "Créneaux spécifiques",
      icon: <Search className="w-3 h-3 text-blue-500" />,
      completed: selectionMode === 'sports' 
        ? activitesSelectionnees.length >= 2 
        : creneauxSelectionnes.length >= 2,
      current: currentStep === 3
    },
    {
      id: 4,
      title: "Planning",
      description: "Créneaux trouvés",
      icon: <Target className="w-3 h-3 text-blue-500" />,
      completed: false,
      current: currentStep === 4
    }
  ];

  // Logique métier existante
  const creneaux = useMemo(() => {
    if (activitesAPI.length === 0) return [];
    return extractCreneaux(activitesAPI);
  }, [activitesAPI]);

  const activitesDisponibles = useMemo(() => {
    const toutes = getActivitesDisponibles(creneaux);
    return filtrerActivitesParContraintes(toutes, contraintesHoraires);
  }, [creneaux, contraintesHoraires]);

  const activitesSelectionneesFiltrees = useMemo(() => {
    return activitesDisponibles.filter(a => 
      activitesSelectionnees.includes(a.nom)
    );
  }, [activitesDisponibles, activitesSelectionnees]);

  // Résultats selon le mode de sélection
  const resultats = useMemo(() => {
    if (selectionMode === 'sports') {
      if (activitesSelectionneesFiltrees.length < 2) {
        return { compatibles: [], totalCombinaisons: 0 };
      }
      return trouverCombinaisons(activitesSelectionneesFiltrees);
    } else {
      // Mode créneaux spécifiques
      if (creneauxSelectionnes.length < 2) {
        return { compatibles: [], totalCombinaisons: 0 };
      }
      
      // Vérifier les compatibilités entre créneaux sélectionnés
      const creneauxCompatibles = verifierCompatibiliteCreneaux(creneauxSelectionnes);
      return creneauxCompatibles;
    }
  }, [selectionMode, activitesSelectionneesFiltrees, creneauxSelectionnes]);

  // Chargement des données avec gestion de la restauration des activités
  const chargerDonnees = async (catalogueId?: string, forceRefresh = false) => {
    const idCatalogue = catalogueId || selectedCatalogueId;
    
    if (!idCatalogue) return;

    await loadActivites(idCatalogue, forceRefresh);
  };

  // Chargement automatique quand le catalogue change
  useEffect(() => {
    if (selectedCatalogueId) {
      chargerDonnees();
    }
  }, [selectedCatalogueId]);

  // Gestion de la restauration des activités sélectionnées quand les données changent
  useEffect(() => {
    if (activitesAPI.length > 0 && activitesSelectionnees.length > 0) {
      // Garder seulement les activités sélectionnées qui sont encore disponibles
      const nouvellesActivitesDisponibles = getActivitesDisponibles(extractCreneaux(activitesAPI));
      const filtreesParContraintes = filtrerActivitesParContraintes(nouvellesActivitesDisponibles, contraintesHoraires);
      const nomsActivitesDisponibles = filtreesParContraintes.map(a => a.nom);
      
      const activitesValides = activitesSelectionnees.filter(nom => 
        nomsActivitesDisponibles.includes(nom)
      );
      
      // Ne garder les activités que si au moins une reste valide
      if (activitesValides.length !== activitesSelectionnees.length) {
        setActivitesSelectionnees(activitesValides);
      }
    }
  }, [activitesAPI, contraintesHoraires]);

  // Handlers
  const handleCatalogueChange = (catalogueId: string) => {
    setSelectedCatalogueId(catalogueId);
    // Réinitialiser les sélections quand on change de catalogue
    setActivitesSelectionnees([]);
    setCreneauxSelectionnes([]);
  };

  const handleSelectionChange = (nouvellesActivites: string[]) => {
    setActivitesSelectionnees(nouvellesActivites);
  };

  const handleCreneauxSelectionChange = (nouveauxCreneaux: CreneauSelectionne[]) => {
    setCreneauxSelectionnes(nouveauxCreneaux);
  };

  const handleModeChange = (nouveauMode: typeof selectionMode) => {
    setSelectionMode(nouveauMode);
    // Optionnel : effacer les sélections lors du changement de mode
    // setActivitesSelectionnees([]);
    // setCreneauxSelectionnes([]);
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Logique de validation pour chaque étape
  const canProceedToStep2 = !!selectedCatalogueId && !loading;
  const canProceedToStep3 = true; // Les contraintes horaires sont optionnelles
  const canProceedToStep4 = selectionMode === 'sports' 
    ? activitesSelectionnees.length >= 2 
    : creneauxSelectionnes.length >= 2;

  const getNextDisabled = () => {
    switch (currentStep) {
      case 1: return !canProceedToStep2;
      case 2: return !canProceedToStep3;
      case 3: return !canProceedToStep4;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header compact avec nom du site */}
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm flex-shrink-0">
        <div className="max-w-6xl mx-auto px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-base sm:text-lg">
                  Planificateur SUAPS
                </h1>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              
              {/* Boutons de navigation */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors touch-manipulation ${
                    activeTab === 'search'
                      ? 'bg-white/20 text-white' 
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  title="Recherche de créneaux"
                >
                  <Search className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
                
                {user && (
                  <>
                    <button
                      onClick={() => setActiveTab('auto-reservation')}
                      className={`p-1.5 sm:p-2 rounded-lg transition-colors touch-manipulation ${
                        activeTab === 'auto-reservation'
                          ? 'bg-white/20 text-white' 
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                      title="Auto-réservation"
                    >
                      <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`p-1.5 sm:p-2 rounded-lg transition-colors touch-manipulation ${
                        activeTab === 'history'
                          ? 'bg-white/20 text-white' 
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                      title="Historique"
                    >
                      <History className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </>
                )}
              </div>
              
              {/* Bouton d'authentification */}
              <AuthButton />
            </div>
          </div>
        </div>
      </header>


      {/* Step Indicator - Uniquement pour l'onglet recherche */}
      {activeTab === 'search' && (
        <div className="flex-shrink-0">
          <StepIndicator currentStep={currentStep} steps={steps} />
        </div>
      )}

      {/* Content selon l'onglet actif */}
      <div className="flex-1">
        {activeTab === 'search' && (
        <StepContainer
          currentStep={currentStep}
          totalSteps={4}
          onNext={handleNext}
          onPrevious={handlePrevious}
          nextDisabled={getNextDisabled()}
          showNavigation={true}
        >
          {/* Étape 1: Sélection de la ville */}
          {currentStep === 1 && (
            <div className="space-y-3 sm:space-y-4">
              {/* Sélecteur de ville */}
              <CitySelector
                selectedCatalogueId={selectedCatalogueId}
                onCatalogueChange={handleCatalogueChange}
                disabled={loading}
              />

              {/* Stats rapides si ville sélectionnée */}
              {selectedCatalogueId && !loading && !error && (
                <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-blue-50 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-blue-600">
                        {activitesDisponibles.length}
                      </div>
                      <div className="text-xs text-blue-700">Activités</div>
                    </div>
                    <div className="bg-green-50 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        {creneaux.length}
                      </div>
                      <div className="text-xs text-green-700">Créneaux</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Erreur si applicable */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                  </div>
                  <h3 className="font-bold text-red-900 text-sm mb-1">Erreur</h3>
                  <p className="text-red-700 text-xs">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Étape 2: Configuration des disponibilités */}
          {currentStep === 2 && (
            <div className="space-y-3 sm:space-y-4">
              {/* Contraintes horaires */}
              <HoraireConstraints
                contraintes={contraintesHoraires}
                onChange={setContraintesHoraires}
              />

              {/* Info compacte */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg sm:rounded-xl p-2 sm:p-3">
                <p className="text-xs text-purple-700 text-center">
                  💡 Optionnel - Laissez vide pour tous les créneaux
                </p>
              </div>
            </div>
          )}

          {/* Étape 3: Choix des activités */}
          {currentStep === 3 && (
            <div className="space-y-3 sm:space-y-4">
              {/* Sélecteur de mode */}
              <SelectionModeToggle
                mode={selectionMode}
                onChange={handleModeChange}
                disabled={loading}
              />

              {/* Sélecteur selon le mode */}
              {selectionMode === 'sports' ? (
                <ActivitySelector
                  activites={activitesDisponibles}
                  activitesSelectionnees={activitesSelectionnees}
                  onSelectionChange={handleSelectionChange}
                  loading={loading}
                />
              ) : (
                <CreneauxSelector
                  activites={activitesDisponibles}
                  creneauxSelectionnes={creneauxSelectionnes}
                  onSelectionChange={handleCreneauxSelectionChange}
                  loading={loading}
                />
              )}
            </div>
          )}

          {/* Étape 4: Résultats */}
          {currentStep === 4 && (
            <div className="space-y-3 sm:space-y-4">
              {/* Résultats */}
              <CreneauxResults
                combinaisons={resultats.compatibles}
                totalCombinaisons={resultats.totalCombinaisons}
                loading={loading}
                activitesSelectionnees={selectionMode === 'sports' 
                  ? activitesSelectionnees 
                  : creneauxSelectionnes.map(c => c.activite)
                }
              />

              {/* Aide auto-réservation */}
              {resultats.compatibles.length > 0 && user && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <div className="flex items-start space-x-2">
                    <Bot className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 text-sm">Auto-Réservation</h4>
                      <p className="text-blue-800 text-xs mt-1">
                        Cliquez sur <strong>"Auto"</strong> pour réserver automatiquement à 20h chaque jour
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action compacte */}
              {resultats.compatibles.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-green-700 text-sm mb-3">
                    🎉 {resultats.compatibles.length} combinaison{resultats.compatibles.length > 1 ? 's' : ''} compatible{resultats.compatibles.length > 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation"
                  >
                    Modifier
                  </button>
                </div>
              )}
            </div>
          )}
        </StepContainer>
        )}

        {/* Onglet Auto-réservation */}
        {activeTab === 'auto-reservation' && (
          <div className="p-4">
            <AutoReservationManager />
          </div>
        )}

        {/* Onglet Historique */}
        {activeTab === 'history' && (
          <div className="p-4">
            <AutoReservationHistory />
          </div>
        )}
      </div>
    </div>
  );
} 
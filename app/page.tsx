'use client';

import { useState, useEffect, useMemo } from 'react';
import { ActiviteAPI, ActiviteOption, Creneau, ContraintesHoraires } from '@/types/suaps';
import { 
  extractCreneaux, 
  getActivitesDisponibles, 
  trouverCombinaisons,
  filtrerActivitesParContraintes
} from '@/utils/suaps';
import ActivitySelector from '@/components/ActivitySelector';
import CreneauxResults from '@/components/CreneauxResults';
import HoraireConstraints from '@/components/HoraireConstraints';
import CitySelector from '@/components/CitySelector';
import StepIndicator from '@/components/StepIndicator';
import StepContainer from '@/components/StepContainer';
import { RefreshCw, Calendar, MapPin, Clock, Search, Target } from 'lucide-react';

export default function HomePage() {
  // État principal
  const [currentStep, setCurrentStep] = useState(1);
  const [activitesAPI, setActivitesAPI] = useState<ActiviteAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activitesSelectionnees, setActivitesSelectionnees] = useState<string[]>([]);
  const [selectedCatalogueId, setSelectedCatalogueId] = useState<string | null>(null);
  const [contraintesHoraires, setContraintesHoraires] = useState<ContraintesHoraires>(() => {
    const contraintes: ContraintesHoraires = {};
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    jours.forEach(jour => {
      contraintes[jour] = { jour, actif: false };
    });
    return contraintes;
  });

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
      title: "Sports",
      description: "Choix des activités",
      icon: <Search className="w-3 h-3 text-blue-500" />,
      completed: activitesSelectionnees.length >= 2,
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

  const resultats = useMemo(() => {
    if (activitesSelectionneesFiltrees.length < 2) {
      return { compatibles: [], totalCombinaisons: 0 };
    }
    return trouverCombinaisons(activitesSelectionneesFiltrees);
  }, [activitesSelectionneesFiltrees]);

  // Chargement des données
  const chargerDonnees = async (catalogueId?: string) => {
    const idCatalogue = catalogueId || selectedCatalogueId;
    
    if (!idCatalogue) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/activites?catalogueId=${encodeURIComponent(idCatalogue)}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du chargement des données');
      }
      
      setActivitesAPI(data.data);
      setActivitesSelectionnees([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Chargement automatique quand le catalogue change
  useEffect(() => {
    if (selectedCatalogueId) {
      chargerDonnees();
    }
  }, [selectedCatalogueId]);

  // Handlers
  const handleCatalogueChange = (catalogueId: string) => {
    setSelectedCatalogueId(catalogueId);
  };

  const handleSelectionChange = (nouvellesActivites: string[]) => {
    setActivitesSelectionnees(nouvellesActivites);
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

  const handleRefresh = () => {
    chargerDonnees();
  };

  // Logique de validation pour chaque étape
  const canProceedToStep2 = !!selectedCatalogueId && !loading;
  const canProceedToStep3 = true; // Les contraintes horaires sont optionnelles
  const canProceedToStep4 = activitesSelectionnees.length >= 2;

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
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-white font-bold text-lg">
                Planificateur SUAPS
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="flex-shrink-0">
        <StepIndicator currentStep={currentStep} steps={steps} />
      </div>

      {/* Step Content - Prend tout l'espace restant */}
      <div className="flex-1">
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
            <div className="space-y-4">
              {/* Sélecteur de ville */}
              <CitySelector
                selectedCatalogueId={selectedCatalogueId}
                onCatalogueChange={handleCatalogueChange}
                disabled={loading}
              />

              {/* Stats rapides si ville sélectionnée */}
              {selectedCatalogueId && !loading && !error && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {activitesDisponibles.length}
                      </div>
                      <div className="text-xs text-blue-700">Activités</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {creneaux.length}
                      </div>
                      <div className="text-xs text-green-700">Créneaux</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Erreur si applicable */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <RefreshCw className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="font-bold text-red-900 text-sm mb-1">Erreur</h3>
                  <p className="text-red-700 text-xs">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Étape 2: Configuration des disponibilités */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Contraintes horaires */}
              <HoraireConstraints
                contraintes={contraintesHoraires}
                onChange={setContraintesHoraires}
              />

              {/* Info compacte */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                <p className="text-xs text-purple-700 text-center">
                  💡 Optionnel - Laissez vide pour tous les créneaux
                </p>
              </div>
            </div>
          )}

          {/* Étape 3: Choix des activités */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Sélecteur d'activités */}
              <ActivitySelector
                activites={activitesDisponibles}
                activitesSelectionnees={activitesSelectionnees}
                onSelectionChange={handleSelectionChange}
                loading={loading}
              />
            </div>
          )}

          {/* Étape 4: Résultats */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {/* Résultats */}
              <CreneauxResults
                combinaisons={resultats.compatibles}
                totalCombinaisons={resultats.totalCombinaisons}
                loading={loading}
                activitesSelectionnees={activitesSelectionnees}
              />

              {/* Action compacte */}
              {resultats.compatibles.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-green-700 text-sm mb-3">
                    🎉 {resultats.compatibles.length} combinaison{resultats.compatibles.length > 1 ? 's' : ''} trouvée{resultats.compatibles.length > 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Modifier
                  </button>
                </div>
              )}
            </div>
          )}
        </StepContainer>
      </div>
    </div>
  );
} 
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
import LoadingSpinner from '@/components/LoadingSpinner';
import { RefreshCw, Calendar, Clock, Users, Target } from 'lucide-react';

export default function HomePage() {
  const [activitesAPI, setActivitesAPI] = useState<ActiviteAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activitesSelectionnees, setActivitesSelectionnees] = useState<string[]>([]);
  const [contraintesHoraires, setContraintesHoraires] = useState<ContraintesHoraires>(() => {
    // Initialiser les contraintes pour tous les jours
    const contraintes: ContraintesHoraires = {};
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    jours.forEach(jour => {
      contraintes[jour] = { jour, actif: false };
    });
    return contraintes;
  });

  // Extraction et transformation des données
  const creneaux = useMemo(() => {
    if (activitesAPI.length === 0) return [];
    return extractCreneaux(activitesAPI);
  }, [activitesAPI]);

  const activitesDisponibles = useMemo(() => {
    const toutes = getActivitesDisponibles(creneaux);
    // Appliquer les contraintes horaires
    return filtrerActivitesParContraintes(toutes, contraintesHoraires);
  }, [creneaux, contraintesHoraires]);

  // Filtrage des activités sélectionnées
  const activitesSelectionneesFiltrees = useMemo(() => {
    return activitesDisponibles.filter(a => 
      activitesSelectionnees.includes(a.nom)
    );
  }, [activitesDisponibles, activitesSelectionnees]);

  // Calcul des combinaisons compatibles
  const resultats = useMemo(() => {
    if (activitesSelectionneesFiltrees.length < 2) {
      return { compatibles: [], totalCombinaisons: 0 };
    }
    
    return trouverCombinaisons(activitesSelectionneesFiltrees);
  }, [activitesSelectionneesFiltrees]);

  // Chargement des données depuis l'API
  const chargerDonnees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/activites');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors du chargement des données');
      }
      
      setActivitesAPI(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    chargerDonnees();
  }, []);

  const handleSelectionChange = (nouvellesActivites: string[]) => {
    setActivitesSelectionnees(nouvellesActivites);
  };

  const handleRefresh = () => {
    chargerDonnees();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simple */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Planificateur SUAPS
                </h1>
                <p className="text-sm text-gray-600">
                  Université de Nantes
                </p>
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed 
                       transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Titre simple */}
        {!loading && !error && (
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Trouvez vos créneaux compatibles
            </h2>
            <p className="text-gray-600">
              Sélectionnez vos activités et découvrez les combinaisons possibles
            </p>
          </div>
        )}

        {/* Statistiques simples */}
        {!loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-semibold text-blue-600">
                {activitesDisponibles.length}
              </div>
              <div className="text-sm text-gray-600">Activités</div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-semibold text-green-600">
                {creneaux.length}
              </div>
              <div className="text-sm text-gray-600">Créneaux</div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-semibold text-purple-600">
                {resultats.compatibles.length}
              </div>
              <div className="text-sm text-gray-600">Compatibles</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <div className="text-2xl font-semibold text-orange-600">
                {activitesSelectionnees.length}
              </div>
              <div className="text-sm text-gray-600">Sélectionnées</div>
            </div>
          </div>
        )}

        {/* Contenu principal */}
        {error ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Réessayer
            </button>
          </div>
        ) : (
          <>
            {/* Contraintes horaires */}
            <HoraireConstraints
              contraintes={contraintesHoraires}
              onChange={setContraintesHoraires}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sélecteur d'activités */}
              <div>
                <ActivitySelector
                  activites={activitesDisponibles}
                  activitesSelectionnees={activitesSelectionnees}
                  onSelectionChange={handleSelectionChange}
                  loading={loading}
                />
              </div>

              {/* Résultats */}
              <div>
                <CreneauxResults
                  combinaisons={resultats.compatibles}
                  totalCombinaisons={resultats.totalCombinaisons}
                  loading={loading}
                  activitesSelectionnees={activitesSelectionnees}
                />
              </div>
            </div>
          </>
        )}


      </main>
    </div>
  );
} 
'use client';

import { useMemo, useState } from 'react';
import { Creneau } from '@/types/suaps';
import { 
  Clock, Calendar, AlertCircle, CheckCircle, Target, 
  Copy, MapPin, ExternalLink, Trophy
} from 'lucide-react';

interface CreneauxResultsProps {
  combinaisons: Creneau[][];
  totalCombinaisons: number;
  loading?: boolean;
  activitesSelectionnees: string[];
}

interface CombinaisonWithStats {
  creneaux: Creneau[];
  totalHeures: number;
  joursUtilises: string[];
}

export default function CreneauxResults({
  combinaisons,
  totalCombinaisons,
  loading = false,
  activitesSelectionnees
}: CreneauxResultsProps) {

  const [selectedCombination, setSelectedCombination] = useState<number | null>(null);
  
  // Calculate enhanced stats for each combination
  const JOURS_ORDRE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  const combinaisonsWithStats = useMemo(() => {
    return combinaisons.map((combinaison, index) => {
      const heureToMin = (heure: string) => {
        const [h, m] = heure.split(':').map(Number);
        return h * 60 + m;
      };

      const totalMinutes = combinaison.reduce((acc, creneau) => {
        const debut = heureToMin(creneau.début);
        const fin = heureToMin(creneau.fin);
        return acc + (fin - debut);
      }, 0);

      // Jours utilisés dans l'ordre chronologique
      const joursUtilises = Array.from(new Set(combinaison.map(c => c.jour)))
        .sort((a, b) => JOURS_ORDRE.indexOf(a) - JOURS_ORDRE.indexOf(b));
      
      // Trier les créneaux par jour puis par heure
      const creneauxTries = [...combinaison].sort((a, b) => {
        const jourA = JOURS_ORDRE.indexOf(a.jour);
        const jourB = JOURS_ORDRE.indexOf(b.jour);
        if (jourA !== jourB) return jourA - jourB;
        return a.début.localeCompare(b.début);
      });
      
      return {
        creneaux: creneauxTries,
        totalHeures: totalMinutes / 60,
        joursUtilises
      };
    });
  }, [combinaisons]);

  const copyToClipboard = (combinaison: Creneau[]) => {
    const text = combinaison.map(c => 
      `${c.activité}: ${c.jour} ${c.début}-${c.fin}${c.localisation ? ` - ${c.localisation.nom}` : ''}`
    ).join('\n');
    navigator.clipboard.writeText(text);
  };

  const formatDuration = (heures: number): string => {
    const h = Math.floor(heures);
    const m = Math.round((heures - h) * 60);
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse mr-3"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-300 rounded w-32 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>
        
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-gray-50 rounded-xl p-4">
              <div className="space-y-3">
                <div className="h-4 bg-gray-300 rounded w-20 animate-pulse"></div>
                <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activitesSelectionnees.length < 2) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Résultats</h3>
              <p className="text-purple-100 text-sm">Vos créneaux compatibles</p>
            </div>
          </div>
        </div>
        
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-purple-500" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 mb-2">
            Prêt à chercher !
          </h4>
          <p className="text-sm text-gray-600">
            Sélectionnez au moins 2 activités pour découvrir les créneaux compatibles
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`p-3 sm:p-4 ${combinaisons.length > 0 
        ? 'bg-gradient-to-r from-purple-500 to-purple-600' 
        : 'bg-gradient-to-r from-orange-500 to-orange-600'
      }`}>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center">
            {combinaisons.length > 0 ? (
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            ) : (
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-white font-bold text-sm sm:text-base">
              {combinaisons.length > 0 ? 'Créneaux trouvés !' : 'Aucun créneau compatible'}
            </h3>
            <p className={`text-xs sm:text-sm ${combinaisons.length > 0 ? 'text-purple-100' : 'text-orange-100'}`}>
              {combinaisons.length > 0 
                ? `${combinaisons.length} combinaison${combinaisons.length > 1 ? 's' : ''} possible${combinaisons.length > 1 ? 's' : ''}`
                : 'Essayez d\'autres activités'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {/* Results */}
        {combinaisons.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
              Aucun créneau compatible
            </h4>
            <p className="text-sm text-gray-600 mb-4 sm:mb-6">
              Les activités sélectionnées ont des créneaux qui se chevauchent.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-orange-700">
                💡 <strong>Conseil :</strong> Essayez de sélectionner d'autres activités ou modifiez vos contraintes horaires
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
            {/* Meilleure combinaison en premier */}
            {combinaisonsWithStats.map((combination, index) => (
              <div 
                key={index}
                className={`border-2 rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all duration-200 ${
                  index === 0 
                    ? 'border-purple-500 bg-purple-50 shadow-md' 
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                {/* En-tête de la combinaison */}
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center space-x-2">
                    {index === 0 && (
                      <div className="flex items-center space-x-1 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        <Trophy className="w-3 h-3" />
                        <span>Recommandé</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-gray-600">
                      {formatDuration(combination.totalHeures)}
                    </div>
                    <button
                      onClick={() => copyToClipboard(combination.creneaux)}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                      title="Copier"
                    >
                      <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>

                {/* Liste des créneaux */}
                <div className="space-y-2">
                  {combination.creneaux.map((creneau, creneauIndex) => (
                    <div key={creneauIndex} className="bg-white rounded-lg border border-gray-200 p-2 sm:p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-xs sm:text-sm text-gray-900 truncate">
                              {creneau.activité}
                            </h4>
                          </div>
                          
                          <div className="flex items-center space-x-3 text-xs text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{creneau.jour}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{creneau.début} - {creneau.fin}</span>
                            </div>
                          </div>
                          
                          {creneau.localisation && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{creneau.localisation.nom}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Statistiques compactes */}
                <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      {combination.joursUtilises.length} jour{combination.joursUtilises.length > 1 ? 's' : ''} • {combination.creneaux.length} créneaux
                    </span>
                    <span className="font-medium">
                      Total: {formatDuration(combination.totalHeures)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
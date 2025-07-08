'use client';

import { useMemo, useState } from 'react';
import { Creneau } from '@/types/suaps';
import { 
  Clock, Calendar, AlertCircle, CheckCircle, Target, 
  Copy, MapPin, ExternalLink
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
  conflits: number;
}

export default function CreneauxResults({
  combinaisons,
  totalCombinaisons,
  loading = false,
  activitesSelectionnees
}: CreneauxResultsProps) {

  // Calculate enhanced stats for each combination
  const JOURS_ORDRE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  const combinaisonsWithStats = useMemo(() => {
    return combinaisons.map(combinaison => {
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
        joursUtilises,
        conflits: 0
      };
    });
  }, [combinaisons]);


  const copyToClipboard = (combinaison: Creneau[]) => {
    const text = combinaison.map(c => 
      `${c.activité}: ${c.jour} ${c.début}-${c.fin}${c.localisation ? ` - ${c.localisation.nom}` : ''}`
    ).join('\n');
    navigator.clipboard.writeText(text);
  };

  const createGoogleMapsLink = (localisation: { nom: string; adresse: string; ville: string; codePostal: string }) => {
    const address = `${localisation.adresse}, ${localisation.codePostal} ${localisation.ville}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const formateHour = (debut: string, fin?: string) => {
    if (!fin) {
      //debut est une heure au format float
      const hours = Math.floor(Number(debut));
      const mins = Math.round((Number(debut) - hours) * 60);
      return `${hours}h${mins.toString().padStart(2, '0')}`;
    }
    const minutes = heureToMin(fin) - heureToMin(debut);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="glass-card rounded-lg p-6">
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="w-5 h-5 bg-gray-300 rounded mr-2"></div>
            <div className="h-6 bg-gray-300 rounded w-48"></div>
          </div>
          
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-gray-300 rounded-full mr-3"></div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-20 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                </div>
                
                <div className="space-y-2">
                  <div className="h-12 bg-gray-100 rounded-lg"></div>
                  <div className="h-12 bg-gray-100 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activitesSelectionnees.length < 2) {
    return (
      <div className="glass-card rounded-xl p-6 fade-in">
        <div className="flex items-center text-gray-500 mb-4">
          <Target className="w-6 h-6 mr-3 text-blue-500" />
          <h3 className="text-xl font-semibold">Résultats de recherche</h3>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-blue-500" />
          </div>
          <h4 className="text-lg font-semibold text-gray-800 mb-2">
            Prêt à chercher !
          </h4>
          <p className="text-gray-600 max-w-sm mx-auto">
            Sélectionnez au moins 2 activités dans la liste de gauche pour découvrir 
            les créneaux compatibles.
          </p>
        </div>
      </div>
    );
  }

  const compatibilityRate = totalCombinaisons > 0 ? (combinaisons.length / totalCombinaisons) * 100 : 0;

      return (
      <div className="glass-card rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center mb-4">
          {combinaisons.length > 0 ? (
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Créneaux compatibles
            </h3>
            <p className="text-sm text-gray-600">
              {combinaisons.length} résultat{combinaisons.length > 1 ? 's' : ''} trouvé{combinaisons.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

              {/* Simple stats */}
        {combinaisons.length > 0 && (
          <div className="flex items-center space-x-6 mb-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Target className="w-4 h-4 mr-1" />
              {combinaisons.length} option{combinaisons.length > 1 ? 's' : ''}
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              {Math.round(compatibilityRate)}% compatibilité
            </div>
          </div>
        )}

      {/* Results */}
      {combinaisons.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-orange-500" />
          </div>
          <h4 className="text-xl font-semibold text-gray-800 mb-3">
            Aucun créneau compatible
          </h4>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Les activités sélectionnées ont des créneaux qui se chevauchent.
            Essayez différentes combinaisons d'activités pour trouver des créneaux compatibles.
          </p>
          <div className="flex justify-center space-x-2">
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
              💡 Astuce: Moins d'activités = plus de compatibilité
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {combinaisonsWithStats.slice(0, 10).map((combinaisonStats, index) => {
            
            return (
              <div key={index} className="result-card">
                {/* Simple Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-medium text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Option {index + 1}
                      </h4>
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formateHour(combinaisonStats.totalHeures.toFixed(1))}
                        </span>
                        <span>
                          {combinaisonStats.joursUtilises.join(' • ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => copyToClipboard(combinaisonStats.creneaux)}
                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Copier"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Simple activities view */}
                <div className="space-y-2">
                  {combinaisonStats.creneaux.map((creneau, creneauIndex) => (
                    <div key={creneauIndex} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {creneau.activité.charAt(0).toUpperCase() + creneau.activité.slice(1)}
                            </h5>
                            <p className="text-sm text-gray-600">
                              {creneau.jour} • {creneau.début} - {creneau.fin}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {formateHour(creneau.début, creneau.fin)}
                        </div>
                      </div>
                      
                      {/* Localisation avec lien Google Maps */}
                      {creneau.localisation && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <div className="text-xs text-gray-600">
                              <p className="font-medium">{creneau.localisation.nom}</p>
                              <p>{creneau.localisation.adresse}, {creneau.localisation.ville}</p>
                            </div>
                          </div>
                          
                          <a
                            href={createGoogleMapsLink(creneau.localisation)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 
                                     bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
                            title="Ouvrir dans Google Maps"
                          >
                            <span>Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {combinaisons.length > 10 && (
            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">
                +{combinaisons.length - 10} autres options disponibles
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  function heureToMin(heure: string): number {
    const [h, m] = heure.split(':').map(Number);
    return h * 60 + m;
  }
} 
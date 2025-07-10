'use client';

import { useState, useMemo } from 'react';
import { ActiviteOption } from '@/types/suaps';
import SearchInput from './SearchInput';
import CalendarView from './CalendarView';
import { Check, Search, Clock, ChevronDown } from 'lucide-react';

interface ActivitySelectorProps {
  activites: ActiviteOption[];
  activitesSelectionnees: string[];
  onSelectionChange: (activites: string[]) => void;
  loading?: boolean;
}

export default function ActivitySelector({
  activites,
  activitesSelectionnees,
  onSelectionChange,
  loading = false
}: ActivitySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelected, setShowSelected] = useState(false);

  // Filter activities based on search
  const filteredActivites = useMemo(() => {
    let filtered = activites.filter(activite =>
      activite.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activite.nom.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Si on veut afficher seulement les sélectionnées
    if (showSelected) {
      filtered = filtered.filter(activite => 
        activitesSelectionnees.includes(activite.nom)
      );
    }

    return filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [activites, searchTerm, showSelected, activitesSelectionnees]);

  const handleToggle = (nomActivite: string) => {
    if (activitesSelectionnees.includes(nomActivite)) {
      onSelectionChange(activitesSelectionnees.filter(a => a !== nomActivite));
    } else {
      onSelectionChange([...activitesSelectionnees, nomActivite]);
    }
  };

  const clearAll = () => {
    onSelectionChange([]);
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
        
        {/* Loading search bar */}
        <div className="h-12 bg-gray-200 rounded-xl animate-pulse mb-4"></div>
        
        {/* Loading activities */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-40 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">
                Choisissez vos activités
              </h2>
              <p className="text-green-100 text-sm">
                {activites.length} activités • {activitesSelectionnees.length} sélectionnées
              </p>
            </div>
          </div>
          
          {activitesSelectionnees.length > 0 && (
            <button
              onClick={clearAll}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-white text-sm font-medium transition-colors"
            >
              Tout effacer
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Search Bar */}
        <div className="mb-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Rechercher une activité..."
            className="w-full"
          />
        </div>

        {/* Filtre rapide */}
        {activitesSelectionnees.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setShowSelected(!showSelected)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                showSelected 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>Mes sélections</span>
              <div className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {activitesSelectionnees.length}
              </div>
            </button>
          </div>
        )}

        {/* Activities List */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {filteredActivites.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="font-medium">
                {showSelected ? 'Aucune activité sélectionnée' : 'Aucune activité trouvée'}
              </p>
              <p className="text-sm">
                {showSelected 
                  ? 'Commencez par sélectionner des activités' 
                  : 'Essayez un autre terme de recherche'
                }
              </p>
            </div>
          ) : (
            filteredActivites.map((activite) => {
              const isSelected = activitesSelectionnees.includes(activite.nom);
              
              return (
                <button
                  key={activite.nom}
                  onClick={() => handleToggle(activite.nom)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'border-green-500 bg-green-50 shadow-md' 
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Checkbox */}
                    <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    
                    {/* Activity Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-semibold text-sm truncate ${
                          isSelected ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          {activite.displayName}
                        </h3>
                        <div className={`flex items-center text-xs ${
                          isSelected ? 'text-green-700' : 'text-gray-500'
                        }`}>
                          <Clock className="w-3 h-3 mr-1" />
                          {activite.creneaux.length} créneaux
                        </div>
                      </div>
                      
                      {/* Calendar view compact */}
                      <CalendarView 
                        creneaux={activite.creneaux} 
                        activite={activite.nom}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
        
        {/* Selection Summary */}
        {activitesSelectionnees.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-green-900">
                {activitesSelectionnees.length} activité{activitesSelectionnees.length > 1 ? 's' : ''} sélectionnée{activitesSelectionnees.length > 1 ? 's' : ''}
              </span>
              
              {activitesSelectionnees.length >= 2 ? (
                <div className="flex items-center text-xs text-green-600">
                  <Check className="w-3 h-3 mr-1" />
                  Prêt !
                </div>
              ) : (
                <div className="text-xs text-green-700">
                  +{2 - activitesSelectionnees.length} pour comparer
                </div>
              )}
            </div>
            
            {activitesSelectionnees.length < 2 && (
              <p className="text-xs text-green-700">
                💡 Sélectionnez au moins 2 activités pour voir les créneaux compatibles
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
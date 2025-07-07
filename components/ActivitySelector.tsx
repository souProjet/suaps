'use client';

import { useState, useMemo } from 'react';
import { ActiviteOption } from '@/types/suaps';
import SearchInput from './SearchInput';
import CalendarView from './CalendarView';
import { Check, Search, Clock } from 'lucide-react';

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

  // Filter activities based on search
  const filteredActivites = useMemo(() => {
    return activites.filter(activite =>
      activite.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activite.nom.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [activites, searchTerm]);



  const handleToggle = (nomActivite: string) => {
    if (activitesSelectionnees.includes(nomActivite)) {
      onSelectionChange(activitesSelectionnees.filter(a => a !== nomActivite));
    } else {
      onSelectionChange([...activitesSelectionnees, nomActivite]);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Search className="w-5 h-5 text-blue-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-800">
            Activités disponibles
          </h2>
        </div>
        
        {/* Loading search bar */}
        <div className="mb-4">
          <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        
        {/* Loading activities */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="activity-card">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-300 rounded mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Search className="w-5 h-5 text-blue-500 mr-2" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Activités disponibles
            </h2>
            <p className="text-sm text-gray-600">
              {activites.length} activités • {activitesSelectionnees.length} sélectionnées
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Rechercher une activité..."
          className="w-full"
        />
      </div>

      {/* Activities List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredActivites.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Aucune activité trouvée</p>
            <p className="text-sm">Essayez un autre terme de recherche</p>
          </div>
        ) : (
          filteredActivites.map((activite) => {
            const isSelected = activitesSelectionnees.includes(activite.nom);
            
            return (
              <div
                key={activite.nom}
                className={`activity-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleToggle(activite.nom)}
              >
                <div className="flex items-start space-x-3">
                  {/* Checkbox */}
                  <div className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-gray-300 hover:border-blue-400'
                  }`}>
                    {isSelected && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  
                  {/* Activity Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {activite.displayName}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {activite.creneaux.length}
                      </div>
                    </div>
                    
                    {/* Calendar view */}
                    <CalendarView 
                      creneaux={activite.creneaux} 
                      activite={activite.nom}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Selection Summary */}
      {activitesSelectionnees.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {activitesSelectionnees.length} activité{activitesSelectionnees.length > 1 ? 's' : ''} sélectionnée{activitesSelectionnees.length > 1 ? 's' : ''}
            </span>
            
            {activitesSelectionnees.length >= 2 && (
              <div className="flex items-center text-xs text-green-600">
                <Check className="w-3 h-3 mr-1" />
                Prêt !
              </div>
            )}
          </div>
          
          {activitesSelectionnees.length < 2 && (
            <p className="text-xs text-blue-700 mt-1">
              Sélectionnez au moins 2 activités pour voir les créneaux compatibles
            </p>
          )}
        </div>
      )}
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { CatalogueOption } from '@/types/suaps';
import { MapPin, Check } from 'lucide-react';

interface CitySelectorProps {
  selectedCatalogueId: string | null;
  onCatalogueChange: (catalogueId: string) => void;
  disabled?: boolean;
}

export default function CitySelector({
  selectedCatalogueId,
  onCatalogueChange,
  disabled = false
}: CitySelectorProps) {
  const [catalogues, setCatalogues] = useState<CatalogueOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les catalogues disponibles
  useEffect(() => {
    const chargerCatalogues = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/catalogues');
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Erreur lors du chargement des catalogues');
        }
        
        setCatalogues(data.data);
        
        // Sélectionner automatiquement le premier catalogue si aucun n'est sélectionné
        if (!selectedCatalogueId && data.data.length > 0) {
          onCatalogueChange(data.data[0].id);
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        console.error('Erreur lors du chargement des catalogues:', err);
      } finally {
        setLoading(false);
      }
    };

    chargerCatalogues();
  }, [selectedCatalogueId, onCatalogueChange]);

  if (loading) {
    return (
      <div className="mb-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center space-x-3 text-red-600">
            <MapPin className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Erreur de chargement</p>
              <p className="text-xs text-red-500">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 sm:mb-4">
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm sm:text-base">Choisissez votre ville</h2>
              <p className="text-blue-100 text-xs sm:text-sm">
                {catalogues.length} ville{catalogues.length > 1 ? 's' : ''} disponible{catalogues.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Cities Grid - Mobile First */}
        <div className="p-3 sm:p-4">
          {catalogues.length === 1 ? (
            /* Single city - show as info */
            <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                </div>
                <div>
                  <p className="font-medium text-blue-900 text-sm">{catalogues[0].ville}</p>
                  <p className="text-xs text-blue-700">Ville sélectionnée automatiquement</p>
                </div>
              </div>
            </div>
          ) : (
            /* Multiple cities - show as selection cards */
            <div className="space-y-2 sm:space-y-3">
              {catalogues.map((catalogue) => {
                const isSelected = selectedCatalogueId === catalogue.id;
                
                return (
                  <button
                    key={catalogue.id}
                    onClick={() => onCatalogueChange(catalogue.id)}
                    disabled={disabled}
                    className={`
                      w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-200 text-left touch-manipulation
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-lg' 
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 active:bg-gray-200'
                      }
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className={`
                          w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-gray-300'
                          }
                        `}>
                          {isSelected && (
                            <Check className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm sm:text-base ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {catalogue.ville}
                          </p>
                          <p className={`text-xs sm:text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                            Activités SUAPS
                          </p>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Sélectionnée
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
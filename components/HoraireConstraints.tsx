'use client';

import { useState } from 'react';
import { ContraintesHoraires } from '@/types/suaps';
import { Clock, ChevronDown, RotateCcw, Sun, Sunset, Zap } from 'lucide-react';

interface HoraireConstraintsProps {
  contraintes: ContraintesHoraires;
  onChange: (nouvelles: ContraintesHoraires) => void;
}

const JOURS_SEMAINE = [
  { nom: 'Lundi', court: 'Lun' },
  { nom: 'Mardi', court: 'Mar' },
  { nom: 'Mercredi', court: 'Mer' },
  { nom: 'Jeudi', court: 'Jeu' },
  { nom: 'Vendredi', court: 'Ven' },
  { nom: 'Samedi', court: 'Sam' },
  { nom: 'Dimanche', court: 'Dim' }
];

const PRESETS = [
  {
    nom: 'Matins',
    icon: <Sun className="w-3 h-3" />,
    heures: { debut: '08:00', fin: '12:00' }
  },
  {
    nom: 'Après-midi',
    icon: <Sunset className="w-3 h-3" />,
    heures: { debut: '14:00', fin: '18:00' }
  },
  {
    nom: 'Soir',
    icon: <Clock className="w-3 h-3" />,
    heures: { debut: '18:00', fin: '23:00' }
  },
  {
    nom: 'Journée',
    icon: <Zap className="w-3 h-3" />,
    heures: { debut: '08:00', fin: '18:00' }
  }
];

export default function HoraireConstraints({ contraintes, onChange }: HoraireConstraintsProps) {
  const [expanded, setExpanded] = useState(false);

  const updateContrainte = (jour: string, nouvelleDonnees: Partial<typeof contraintes[string]>) => {
    const nouvelles = {
      ...contraintes,
      [jour]: {
        ...contraintes[jour],
        ...nouvelleDonnees
      }
    };
    onChange(nouvelles);
  };

  const toggleJour = (jour: string) => {
    const contrainte = contraintes[jour];
    if (contrainte?.actif) {
      // Désactiver
      updateContrainte(jour, { actif: false });
    } else {
      // Activer avec des heures par défaut
      updateContrainte(jour, { 
        actif: true, 
        heureDebut: contrainte?.heureDebut || '09:00',
        heureFin: contrainte?.heureFin || '17:00'
      });
    }
  };

  const appliquerPreset = (preset: typeof PRESETS[0]) => {
    const nouvelles: ContraintesHoraires = { ...contraintes };
    
    // Appliquer aux jours de semaine (Lundi à Vendredi)
    ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].forEach(jour => {
      nouvelles[jour] = {
        jour,
        actif: true,
        heureDebut: preset.heures.debut,
        heureFin: preset.heures.fin
      };
    });
    
    onChange(nouvelles);
  };

  const resetTout = () => {
    const nouvelles: ContraintesHoraires = {};
    JOURS_SEMAINE.forEach(({ nom }) => {
      nouvelles[nom] = { jour: nom, actif: false };
    });
    onChange(nouvelles);
  };

  const nombreContraintesActives = JOURS_SEMAINE.filter(({ nom }) => 
    contraintes[nom]?.actif
  ).length;

  return (
    <div className="mb-3 sm:mb-4">
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Header simplifié */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 sm:p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Mes disponibilités</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {nombreContraintesActives === 0 
                    ? 'Toutes les heures' 
                    : `${nombreContraintesActives} jour${nombreContraintesActives > 1 ? 's' : ''} configuré${nombreContraintesActives > 1 ? 's' : ''}`
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {nombreContraintesActives > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resetTout();
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              )}
              <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>

        {/* Contenu */}
        {expanded && (
          <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
            {/* Presets rapides */}
            <div className="mb-3 sm:mb-4">
              <p className="text-xs font-medium text-gray-700 mb-2">Raccourcis :</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.nom}
                    onClick={() => appliquerPreset(preset)}
                    className="flex items-center space-x-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-700 rounded-lg text-xs font-medium transition-colors touch-manipulation"
                  >
                    {preset.icon}
                    <span>{preset.nom}</span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              Configurez vos créneaux ou laissez vide pour toutes les heures
            </p>

            {/* Jours en grille mobile-friendly */}
            <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
              {JOURS_SEMAINE.map(({ nom, court }) => {
                const contrainte = contraintes[nom] || { jour: nom, actif: false };
                const isActive = contrainte.actif;
                
                return (
                  <div key={nom} className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
                    {/* Toggle jour */}
                    <div
                      onClick={() => toggleJour(nom)}
                      className={`w-full p-3 sm:p-4 cursor-pointer select-none transition-colors touch-manipulation ${
                        isActive ? 'bg-blue-50' : 'hover:bg-gray-50 active:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isActive 
                              ? 'border-blue-500 bg-blue-500' 
                              : 'border-gray-300'
                          }`}>
                            {isActive && (
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{nom}</p>
                            {isActive && contrainte.heureDebut && contrainte.heureFin && (
                              <p className="text-xs sm:text-sm text-blue-600">
                                {contrainte.heureDebut} - {contrainte.heureFin}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {isActive && (
                          <div className="bg-blue-500 text-white px-2 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium">
                            Actif
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Contrôles horaires simplifiés */}
                    {isActive && (
                      <div className="border-t border-gray-100 p-3 sm:p-4 bg-gray-50">
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-2">
                              Début
                            </label>
                            <input
                              type="time"
                              value={contrainte.heureDebut || ''}
                              onChange={(e) => updateContrainte(nom, { heureDebut: e.target.value || undefined })}
                              className="w-full px-2 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
                              min="06:00"
                              max="23:30"
                              step="1800"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-2">
                              Fin
                            </label>
                            <input
                              type="time"
                              value={contrainte.heureFin || ''}
                              onChange={(e) => updateContrainte(nom, { heureFin: e.target.value || undefined })}
                              className="w-full px-2 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200 bg-white"
                              min="06:00"
                              max="23:30"
                              step="1800"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Info helper */}
            {nombreContraintesActives === 0 && (
              <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl">
                <p className="text-xs sm:text-sm text-blue-700 text-center">
                  💡 Aucune contrainte = toutes les heures sont disponibles
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
'use client';

import { useState } from 'react';
import { ContraintesHoraires } from '@/types/suaps';
import { Clock, ChevronDown, RotateCcw, Plus } from 'lucide-react';

interface HoraireConstraintsProps {
  contraintes: ContraintesHoraires;
  onChange: (nouvelles: ContraintesHoraires) => void;
}

const JOURS_SEMAINE = [
  { nom: 'Lundi', court: 'Lundi', couleur: 'blue' },
  { nom: 'Mardi', court: 'Mardi', couleur: 'green' },
  { nom: 'Mercredi', court: 'Mercredi', couleur: 'red' },
  { nom: 'Jeudi', court: 'Jeudi', couleur: 'purple' },
  { nom: 'Vendredi', court: 'Vendredi', couleur: 'pink' },
  { nom: 'Samedi', court: 'Samedi', couleur: 'orange' },
  { nom: 'Dimanche', court: 'Dimanche', couleur: 'red' }
];

const PRESETS = [
  { nom: 'Matin', debut: '08:00', fin: '12:00' },
  { nom: 'Midi', debut: '12:00', fin: '14:00' },
  { nom: 'Après-midi', debut: '14:00', fin: '18:00' },
  { nom: 'Soir', debut: '18:00', fin: '23:00' }
];

export default function HoraireConstraints({ contraintes, onChange }: HoraireConstraintsProps) {
  const [expanded, setExpanded] = useState(false);

  const updateContrainte = (jour: string, champ: keyof typeof contraintes[string], valeur: any) => {
    const nouvelles = {
      ...contraintes,
      [jour]: {
        ...contraintes[jour],
        [champ]: valeur
      }
    };
    onChange(nouvelles);
  };

  const toggleJour = (jour: string) => {
    const contrainte = contraintes[jour];
    if (contrainte?.actif) {
      updateContrainte(jour, 'actif', false);
    } else {
      updateContrainte(jour, 'actif', true);
      if (!contrainte?.heureDebut) updateContrainte(jour, 'heureDebut', '09:00');
      if (!contrainte?.heureFin) updateContrainte(jour, 'heureFin', '17:00');
    }
  };

  const appliquerPreset = (preset: typeof PRESETS[0]) => {
    const nouvelles = { ...contraintes };
    JOURS_SEMAINE.forEach(({ nom }) => {
      nouvelles[nom] = {
        jour: nom,
        actif: true,
        heureDebut: preset.debut,
        heureFin: preset.fin
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
    <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
      {/* Header moderne */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50/50 transition-all duration-200"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Créneaux de disponibilité</h3>
            <p className="text-xs text-gray-500">
              {nombreContraintesActives === 0 
                ? 'Aucune contrainte définie' 
                : `${nombreContraintesActives} jour${nombreContraintesActives > 1 ? 's' : ''} configuré${nombreContraintesActives > 1 ? 's' : ''}`
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {nombreContraintesActives > 0 && (
            <div className="flex items-center space-x-1">
              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full font-medium">
                {nombreContraintesActives}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resetTout();
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Reset"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Contenu moderne */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-white">
          {/* Presets rapides */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Presets rapides :</p>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.nom}
                  onClick={() => appliquerPreset(preset)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-blue-100 text-xs text-gray-700 hover:text-blue-700 rounded-lg transition-all duration-200 font-medium"
                >
                  {preset.nom}
                </button>
              ))}
            </div>
          </div>
          
          {/* Jours de la semaine - Design moderne */}
          <div className="grid grid-cols-7 gap-2">
            {JOURS_SEMAINE.map(({ nom, court, couleur }) => {
              const contrainte = contraintes[nom] || { jour: nom, actif: false };
              const isActive = contrainte.actif;
              
              return (
                <div key={nom} className="space-y-2">
                  {/* Bouton jour moderne */}
                  <button
                    onClick={() => toggleJour(nom)}
                    className={`w-full p-2 rounded-xl border-2 transition-all duration-200 ${
                      isActive 
                        ? `bg-${couleur}-500 border-${couleur}-500 text-white shadow-lg shadow-${couleur}-200` 
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{court}</div>
                    {isActive && contrainte.heureDebut && contrainte.heureFin && (
                      <div className="text-[10px] opacity-90 mt-0.5">
                        {contrainte.heureDebut?.slice(0,2)}h-{contrainte.heureFin?.slice(0,2)}h
                      </div>
                    )}
                  </button>
                  
                  {/* Contrôles horaires élégants */}
                  {isActive && (
                    <div className="space-y-1">
                      <div className="relative">
                        <input
                          type="time"
                          value={contrainte.heureDebut || ''}
                          onChange={(e) => updateContrainte(nom, 'heureDebut', e.target.value || undefined)}
                          className={`w-full px-2 py-1 text-xs border-2 border-${couleur}-200 rounded-lg focus:border-${couleur}-500 focus:ring-1 focus:ring-${couleur}-200 bg-${couleur}-50`}
                          min="06:00"
                          max="23:30"
                          step="1800"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="time"
                          value={contrainte.heureFin || ''}
                          onChange={(e) => updateContrainte(nom, 'heureFin', e.target.value || undefined)}
                          className={`w-full px-2 py-1 text-xs border-2 border-${couleur}-200 rounded-lg focus:border-${couleur}-500 focus:ring-1 focus:ring-${couleur}-200 bg-${couleur}-50`}
                          min="06:00"
                          max="23:30"
                          step="1800"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Message d'aide moderne */}
          {nombreContraintesActives === 0 && (
            <div className="mt-4 text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-2xl mb-1">⏰</div>
              <p className="text-xs text-gray-600">
                Cliquez sur les jours pour définir vos créneaux de disponibilité
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
'use client';

import { SelectionMode } from '@/types/suaps';
import { Calendar, Target } from 'lucide-react';

interface SelectionModeToggleProps {
  mode: SelectionMode;
  onChange: (mode: SelectionMode) => void;
  disabled?: boolean;
}

export default function SelectionModeToggle({ 
  mode, 
  onChange, 
  disabled = false 
}: SelectionModeToggleProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
        Mode de sélection
      </h3>
      
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onChange('sports')}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation ${
            mode === 'sports'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Target className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>Sports entiers</span>
        </button>
        
        <button
          onClick={() => onChange('creneaux')}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation ${
            mode === 'creneaux'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>Créneaux spécifiques</span>
        </button>
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        {mode === 'sports' 
          ? 'Sélectionnez des sports avec tous leurs créneaux'
          : 'Choisissez uniquement les créneaux qui vous intéressent'
        }
      </p>
    </div>
  );
}

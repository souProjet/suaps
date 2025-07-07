'use client';

import { Creneau } from '@/types/suaps';
import { Clock } from 'lucide-react';

interface CalendarViewProps {
  creneaux: Creneau[];
  activite: string;
  className?: string;
}

const JOURS_ORDRE = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
];

export default function CalendarView({ creneaux, activite, className = "" }: CalendarViewProps) {
  // Grouper les créneaux par jour
  const creneauxParJour = creneaux.reduce((acc, creneau) => {
    if (!acc[creneau.jour]) {
      acc[creneau.jour] = [];
    }
    acc[creneau.jour].push(creneau);
    return acc;
  }, {} as Record<string, Creneau[]>);

  // Trier les créneaux de chaque jour par heure
  Object.keys(creneauxParJour).forEach(jour => {
    creneauxParJour[jour].sort((a, b) => a.début.localeCompare(b.début));
  });

  return (
    <div className={`grid grid-cols-7 gap-1 ${className}`}>
      {JOURS_ORDRE.map(jour => {
        const creneauxDuJour = creneauxParJour[jour] || [];
        const hasActivity = creneauxDuJour.length > 0;
        
        return (
          <div key={jour} className={`day-card ${hasActivity ? 'has-activity' : ''}`}>
            {/* Nom du jour */}
            <div className="text-xs font-medium text-gray-600 mb-1">
              {jour.slice(0, 3)}
            </div>
            
            {/* Créneaux */}
            <div className="space-y-1">
              {creneauxDuJour.length > 0 ? (
                creneauxDuJour.map((creneau, index) => (
                  <div key={index} className="text-xs">
                    <div className="flex items-center text-gray-700">
                      <Clock className="w-2.5 h-2.5 mr-1" />
                      <span>{creneau.début}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400">-</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 
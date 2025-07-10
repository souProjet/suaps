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
    <>
      {/* Version mobile - liste compacte */}
      <div className={`block sm:hidden ${className}`}>
        <div className="flex flex-wrap gap-1">
          {JOURS_ORDRE.map(jour => {
            const creneauxDuJour = creneauxParJour[jour] || [];
            const hasActivity = creneauxDuJour.length > 0;
            
            if (!hasActivity) return null;
            
            return (
              <div key={jour} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                <span className="font-medium">{jour.slice(0, 3)}</span>
                <span className="ml-1">
                  {creneauxDuJour[0].début}
                  {creneauxDuJour.length > 1 && `+${creneauxDuJour.length - 1}`}
                </span>
              </div>
            );
          })}
          {JOURS_ORDRE.every(jour => !creneauxParJour[jour]?.length) && (
            <span className="text-xs text-gray-400">Aucun créneau disponible</span>
          )}
        </div>
      </div>

      {/* Version desktop - grid classique */}
      <div className={`hidden sm:grid grid-cols-7 gap-1 ${className}`}>
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
    </>
  );
} 
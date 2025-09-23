'use client';

import { useState, useMemo } from 'react';
import { ActiviteOption, CreneauSelectionne, Creneau } from '@/types/suaps';
import SearchInput from './SearchInput';
import { Check, Clock, Calendar, MapPin, Search } from 'lucide-react';

interface CreneauxSelectorProps {
  activites: ActiviteOption[];
  creneauxSelectionnes: CreneauSelectionne[];
  onSelectionChange: (creneaux: CreneauSelectionne[]) => void;
  loading?: boolean;
}

export default function CreneauxSelector({
  activites,
  creneauxSelectionnes,
  onSelectionChange,
  loading = false
}: CreneauxSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelected, setShowSelected] = useState(false);

  // Convertir tous les créneaux en liste plate avec informations d'activité
  const tousLesCreneaux = useMemo(() => {
    const creneaux: (Creneau & { activiteDisplayName: string })[] = [];
    
    activites.forEach(activite => {
      activite.creneaux.forEach(creneau => {
        creneaux.push({
          ...creneau,
          activiteDisplayName: activite.displayName
        });
      });
    });
    
    return creneaux;
  }, [activites]);

  // Filtrer les créneaux selon la recherche
  const creneauxFiltres = useMemo(() => {
    let filtered = tousLesCreneaux.filter(creneau =>
      creneau.activiteDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creneau.activité.toLowerCase().includes(searchTerm.toLowerCase()) ||
      creneau.jour.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Si on veut afficher seulement les sélectionnés
    if (showSelected) {
      filtered = filtered.filter(creneau => 
        creneauxSelectionnes.some(selected => 
          selected.activite === creneau.activité &&
          selected.jour === creneau.jour &&
          selected.debut === creneau.début &&
          selected.fin === creneau.fin
        )
      );
    }

    // Trier par activité puis par jour puis par heure
    const JOURS_ORDRE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    
    return filtered.sort((a, b) => {
      // D'abord par activité
      if (a.activiteDisplayName !== b.activiteDisplayName) {
        return a.activiteDisplayName.localeCompare(b.activiteDisplayName);
      }
      
      // Puis par jour
      const jourA = JOURS_ORDRE.indexOf(a.jour);
      const jourB = JOURS_ORDRE.indexOf(b.jour);
      if (jourA !== jourB) return jourA - jourB;
      
      // Enfin par heure
      return a.début.localeCompare(b.début);
    });
  }, [tousLesCreneaux, searchTerm, showSelected, creneauxSelectionnes]);

  // Vérifier si un créneau est sélectionné
  const isCreneauSelected = (creneau: Creneau): boolean => {
    return creneauxSelectionnes.some(selected => 
      selected.activite === creneau.activité &&
      selected.jour === creneau.jour &&
      selected.debut === creneau.début &&
      selected.fin === creneau.fin
    );
  };

  // Gérer la sélection/désélection d'un créneau
  const handleToggleCreneau = (creneau: Creneau) => {
    const isSelected = isCreneauSelected(creneau);
    
    if (isSelected) {
      // Retirer le créneau
      const nouveauxCreneaux = creneauxSelectionnes.filter(selected => 
        !(selected.activite === creneau.activité &&
          selected.jour === creneau.jour &&
          selected.debut === creneau.début &&
          selected.fin === creneau.fin)
      );
      onSelectionChange(nouveauxCreneaux);
    } else {
      // Ajouter le créneau avec limite de 4 créneaux maximum
      if (creneauxSelectionnes.length >= 4) {
        return; // Ne pas ajouter si limite atteinte
      }
      
      const nouveauCreneau: CreneauSelectionne = {
        activite: creneau.activité,
        jour: creneau.jour,
        debut: creneau.début,
        fin: creneau.fin,
        localisation: creneau.localisation,
        // Préserver les données complètes pour l'auto-réservation
        activiteId: creneau.activiteId,
        creneauId: creneau.creneauId,
        activiteData: creneau.activiteData,
        creneauData: creneau.creneauData
      };
      
      onSelectionChange([...creneauxSelectionnes, nouveauCreneau]);
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
        
        {/* Loading slots */}
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
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-sm sm:text-base">
                Choisissez vos créneaux
              </h2>
              <p className="text-green-100 text-xs sm:text-sm">
                {tousLesCreneaux.length} créneaux • {creneauxSelectionnes.length}/4 sélectionnés
              </p>
            </div>
          </div>
          
          {creneauxSelectionnes.length > 0 && (
            <button
              onClick={clearAll}
              className="bg-white/20 hover:bg-white/30 active:bg-white/40 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-white text-xs sm:text-sm font-medium transition-colors touch-manipulation"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {/* Search Bar */}
        <div className="mb-3 sm:mb-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Rechercher par activité, jour..."
            className="w-full"
          />
        </div>

        {/* Filtre rapide */}
        {creneauxSelectionnes.length > 0 && (
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <button
              onClick={() => setShowSelected(!showSelected)}
              className={`flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                showSelected 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
              }`}
            >
              <span>Mes sélections</span>
              <div className="bg-white/20 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-xs">
                {creneauxSelectionnes.length}
              </div>
            </button>
          </div>
        )}

        {/* Slots List */}
        <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto">
          {creneauxFiltres.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <Search className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 opacity-50" />
              <p className="font-medium text-sm">
                {showSelected ? 'Aucun créneau sélectionné' : 'Aucun créneau trouvé'}
              </p>
              <p className="text-xs sm:text-sm">
                {showSelected 
                  ? 'Commencez par sélectionner des créneaux' 
                  : 'Essayez un autre terme de recherche'
                }
              </p>
            </div>
          ) : (
            creneauxFiltres.map((creneau, index) => {
              const isSelected = isCreneauSelected(creneau);
              const isDisabled = !isSelected && creneauxSelectionnes.length >= 4;
              
              return (
                <button
                  key={`${creneau.activité}-${creneau.jour}-${creneau.début}-${index}`}
                  onClick={() => handleToggleCreneau(creneau)}
                  disabled={isDisabled}
                  className={`w-full text-left p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-200 touch-manipulation ${
                    isSelected 
                      ? 'border-green-500 bg-green-50 shadow-md' 
                      : isDisabled
                      ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    {/* Checkbox */}
                    <div className={`mt-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'bg-green-500 border-green-500' 
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <Check className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                      )}
                    </div>
                    
                    {/* Slot Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <h3 className={`font-semibold text-xs sm:text-sm truncate ${
                          isSelected ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          {creneau.activiteDisplayName}
                        </h3>
                      </div>
                      
                      <div className={`flex items-center space-x-3 text-xs ${
                        isSelected ? 'text-green-700' : 'text-gray-600'
                      }`}>
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
                        <div className={`flex items-center space-x-1 text-xs mt-1 ${
                          isSelected ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{creneau.localisation.nom}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
        
        {/* Selection Summary */}
        {creneauxSelectionnes.length > 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-green-900">
                {creneauxSelectionnes.length} créneau{creneauxSelectionnes.length > 1 ? 'x' : ''} sélectionné{creneauxSelectionnes.length > 1 ? 's' : ''}
              </span>
              
              {creneauxSelectionnes.length >= 2 ? (
                <div className="flex items-center text-xs text-green-600">
                  <Check className="w-3 h-3 mr-1" />
                  Prêt !
                </div>
              ) : (
                <div className="text-xs text-green-700">
                  +{2 - creneauxSelectionnes.length} pour comparer
                </div>
              )}
            </div>
            
            {/* Limite */}
            <div className="flex items-center justify-between text-xs text-green-700 mb-2">
              <span>Créneaux: {creneauxSelectionnes.length}/4</span>
            </div>
            
            {creneauxSelectionnes.length < 2 && (
              <p className="text-xs text-green-700">
                💡 Sélectionnez au moins 2 créneaux pour voir les compatibilités
              </p>
            )}
            
            {/* Messages d'avertissement pour les limites */}
            {creneauxSelectionnes.length >= 4 && (
              <p className="text-xs text-orange-700 mt-2">
                ⚠️ Limite de 4 créneaux atteinte
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

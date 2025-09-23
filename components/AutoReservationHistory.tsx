'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Settings, Clock, CheckCircle, XCircle, AlertCircle, Bot } from 'lucide-react';
import { getCurrentUser } from '@/utils/auth';
import { CreneauAutoReservation, LogReservation } from '@/utils/database';
import { UserProfile } from '@/types/suaps';

export default function AutoReservationHistory() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [creneauxAuto, setCreneauxAuto] = useState<CreneauAutoReservation[]>([]);
  const [logs, setLogs] = useState<LogReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    if (currentUser) {
      chargerDonnees();
    } else {
      setLoading(false);
    }
  }, []);

  const chargerDonnees = async () => {
    try {
      setLoading(true);
      
      // Charger les créneaux auto-réservation
      const responseCreneaux = await fetch('/api/auto-reservation/list', {
        credentials: 'include'
      });
      
      if (responseCreneaux.ok) {
        const creneaux = await responseCreneaux.json();
        setCreneauxAuto(creneaux);
      }
      
      // Charger les logs
      const responseLogs = await fetch('/api/auto-reservation/logs', {
        credentials: 'include'
      });
      
      if (responseLogs.ok) {
        const logsData = await responseLogs.json();
        setLogs(logsData);
      }
      
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  };

  const supprimerCreneauAuto = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette auto-réservation ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/auto-reservation/delete/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await chargerDonnees();
      }
    } catch (error) {
      // Erreur silencieuse
    }
  };

  const toggleActifCreneau = async (id: string, actif: boolean) => {
    try {
      const response = await fetch(`/api/auto-reservation/toggle/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ actif: !actif })
      });

      if (response.ok) {
        await chargerDonnees();
      }
    } catch (error) {
      // Erreur silencieuse
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'QUOTA_FULL':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const calculerProchaineReservation = (jour: string) => {
    const joursMap: { [key: string]: number } = {
      'DIMANCHE': 0, 'LUNDI': 1, 'MARDI': 2, 'MERCREDI': 3,
      'JEUDI': 4, 'VENDREDI': 5, 'SAMEDI': 6
    };
    
    const jourCible = joursMap[jour.toUpperCase()];
    const maintenant = new Date();
    const demain = new Date(maintenant);
    demain.setDate(demain.getDate() + 1);
    
    const prochaineDate = new Date(demain);
    prochaineDate.setDate(prochaineDate.getDate() + 7);
    
    const jourActuel = prochaineDate.getDay();
    const diffJours = (jourCible - jourActuel + 7) % 7;
    prochaineDate.setDate(prochaineDate.getDate() + diffJours);
    
    return prochaineDate.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  if (!user) {
    return (
      <div className="text-center p-6 text-gray-600">
        <Bot className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>Connectez-vous pour voir vos auto-réservations</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <Bot className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 text-sm">Auto-Réservation Active</h3>
            <p className="text-blue-800 text-xs mt-1">
              Tentative de réservation automatique tous les jours à 20h
            </p>
          </div>
        </div>
      </div>

      {/* Créneaux programmés */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
          <h3 className="font-semibold text-gray-900">
            Créneaux programmés ({creneauxAuto.length})
          </h3>
        </div>
        
        {creneauxAuto.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p className="text-sm">Aucun créneau programmé</p>
            <p className="text-xs text-gray-400 mt-1">
              Allez dans Recherche et cliquez sur "Auto"
            </p>
          </div>
        ) : (
          <div className="divide-y max-h-64 overflow-y-auto">
            {creneauxAuto.map((creneau) => (
              <div key={creneau.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {creneau.activiteNom}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      creneau.actif 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {creneau.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <p>{creneau.jour} {creneau.horaireDebut}-{creneau.horaireFin}</p>
                    {creneau.localisation && (
                      <p className="truncate">{creneau.localisation.nom}</p>
                    )}
                    <p className="text-gray-500">
                      ✅ {creneau.nbReussites} | ❌ {creneau.nbTentatives - creneau.nbReussites}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => toggleActifCreneau(creneau.id, creneau.actif)}
                    className={`p-1.5 rounded ${
                      creneau.actif
                        ? 'text-orange-600 hover:bg-orange-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={creneau.actif ? 'Désactiver' : 'Activer'}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => supprimerCreneauAuto(creneau.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historique récent */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
          <h3 className="font-semibold text-gray-900">Historique récent</h3>
        </div>
        
        {logs.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            Aucun historique
          </div>
        ) : (
          <div className="divide-y max-h-48 overflow-y-auto">
            {logs.slice(0, 5).map((log, index) => (
              <div key={index} className="p-3 flex items-center gap-3">
                {getStatutIcon(log.statut)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">
                    {log.activiteNom || 'Activité'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

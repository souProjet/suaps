'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/utils/auth';
import { Bot, Plus, Trash2, ToggleLeft, ToggleRight, Clock, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';

interface CreneauAutoReservation {
  id: string;
  activiteNom: string;
  jour: string;
  horaireDebut: string;
  horaireFin: string;
  actif: boolean;
  nbTentatives: number;
  nbReussites: number;
  derniereTentative?: string;
  derniereReservation?: string;
  options?: {
    priorite?: number;
    maxTentatives?: number;
  };
}

interface LogReservation {
  id: string;
  timestamp: string;
  statut: 'SUCCESS' | 'FAILED' | 'AUTH_ERROR' | 'QUOTA_FULL' | 'NETWORK_ERROR';
  message: string;
  activiteNom: string;
  jour: string;
  horaireDebut: string;
}

interface AutoReservationManagerProps {
  onAddCreneau?: (creneau: any) => void;
}

export default function AutoReservationManager({ onAddCreneau }: AutoReservationManagerProps) {
  const [creneaux, setCreneaux] = useState<CreneauAutoReservation[]>([]);
  const [logs, setLogs] = useState<LogReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'creneaux' | 'logs'>('creneaux');
  
  const user = getCurrentUser();

  useEffect(() => {
    if (user) {
      chargerDonnees();
    }
  }, [user]);

  const chargerDonnees = async () => {
    try {
      setLoading(true);
      
      // Charger créneaux et logs en parallèle
      const [creneauxRes, logsRes] = await Promise.all([
        fetch('/api/auto-reservation/list', { credentials: 'include' }),
        fetch('/api/auto-reservation/logs', { credentials: 'include' })
      ]);

      if (creneauxRes.ok) {
        const creneauxData = await creneauxRes.json();
        setCreneaux(creneauxData);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setLoading(false);
    }
  };

  const toggleCreneau = async (id: string, actif: boolean) => {
    try {
      const response = await fetch(`/api/auto-reservation/toggle/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ actif })
      });

      if (response.ok) {
        setCreneaux(prev => prev.map(c => 
          c.id === id ? { ...c, actif } : c
        ));
      }
    } catch (error) {
      // Erreur silencieuse
    }
  };

  const supprimerCreneau = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce créneau ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/auto-reservation/delete/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setCreneaux(prev => prev.filter(c => c.id !== id));
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
      case 'AUTH_ERROR':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'QUOTA_FULL':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Auto-réservation
        </h3>
        <p className="text-gray-600 mb-4">
          Connectez-vous pour gérer vos créneaux automatiques
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">
            Auto-réservation
          </h2>
        </div>
        <p className="text-gray-600 text-sm">
          Réservation automatique tous les jours à 20h
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('creneaux')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'creneaux'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Mes créneaux ({creneaux.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Historique ({logs.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-2">Chargement...</p>
          </div>
        ) : activeTab === 'creneaux' ? (
          <div>
            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">
                    Fonctionnement
                  </h4>
                  <p className="text-blue-700 text-sm">
                    Tous les jours à 20h, tentative automatique de réservation de vos créneaux pour la semaine suivante.
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions d'ajout */}
            {creneaux.length === 0 && (
              <div className="text-center py-8">
                <Plus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Aucun créneau configuré
                </h3>
                <p className="text-gray-600 mb-4">
                  Allez dans l'onglet Recherche, trouvez vos créneaux et cliquez sur "Auto"
                </p>
              </div>
            )}

            {/* Liste des créneaux */}
            {creneaux.length > 0 && (
              <div className="space-y-3">
                {creneaux.map((creneau) => (
                  <div
                    key={creneau.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      creneau.actif 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {creneau.activiteNom}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            creneau.actif
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {creneau.actif ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {creneau.jour}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {creneau.horaireDebut} - {creneau.horaireFin}
                          </span>
                        </div>

                        {/* Statistiques simplifiées */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>
                            ✅ {creneau.nbReussites} | ❌ {creneau.nbTentatives - creneau.nbReussites}
                          </span>
                          {creneau.derniereReservation && (
                            <span>
                              Dernière: {formatDate(creneau.derniereReservation)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle actif/inactif */}
                        <button
                          onClick={() => toggleCreneau(creneau.id, !creneau.actif)}
                          className={`p-2 rounded-lg transition-colors ${
                            creneau.actif
                              ? 'text-green-600 hover:bg-green-100'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={creneau.actif ? 'Désactiver' : 'Activer'}
                        >
                          {creneau.actif ? (
                            <ToggleRight className="w-5 h-5" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </button>

                        {/* Supprimer */}
                        <button
                          onClick={() => supprimerCreneau(creneau.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Historique des logs */}
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Aucun historique
                </h3>
                <p className="text-gray-600">
                  L'historique des tentatives de réservation apparaîtra ici
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.slice(0, 20).map((log) => (
                  <div
                    key={log.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      {getStatutIcon(log.statut)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900">
                            {log.activiteNom}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-1">
                          {log.jour} {log.horaireDebut}
                        </p>
                        
                        <p className="text-sm text-gray-700">
                          {log.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { getCurrentUser } from '@/utils/auth';
import { Bot, Plus, Trash2, ToggleLeft, ToggleRight, Clock, CheckCircle, XCircle, AlertCircle, Calendar, Settings, RefreshCw } from 'lucide-react';

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
  localisation?: {
    nom: string;
  };
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

export default function AutoReservation() {
  const [creneaux, setCreneaux] = useState<CreneauAutoReservation[]>([]);
  const [logs, setLogs] = useState<LogReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const loadingRef = useRef(false);
  
  useEffect(() => {
    // Éviter les appels multiples en utilisant un flag
    if (initialized) return;
    
    const user = getCurrentUser();
    let timeoutId: NodeJS.Timeout;
    
    if (user) {
      console.log('🚀 Initialisation du composant Auto-réservation pour:', user.code);
      setInitialized(true);
      chargerDonnees();
      
      // Fallback de sécurité - forcer l'arrêt du loading après 15 secondes
      timeoutId = setTimeout(() => {
        console.warn('⚠️ Timeout de sécurité: arrêt forcé du loading après 15s');
        setLoading(false);
        setError('Timeout de chargement. Vérifiez votre connexion.');
      }, 15000);
    } else {
      console.log('👤 Aucun utilisateur connecté');
      setLoading(false);
      setInitialized(true);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [initialized]); // Dépendance uniquement sur initialized

  const chargerDonnees = async () => {
    // Éviter les appels multiples en utilisant un ref
    if (loadingRef.current) {
      console.log('🛑 Chargement déjà en cours, abandon');
      return;
    }
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      console.log('🔄 Début du chargement des données auto-réservation');
      
      // Charger créneaux et logs en parallèle avec timeout
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout des appels API (10s)')), 10000)
      );

      const creneauxPromise = fetch('/api/auto-reservation/list', { 
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const logsPromise = fetch('/api/auto-reservation/logs', { 
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const [creneauxRes, logsRes] = await Promise.race([
        Promise.all([creneauxPromise, logsPromise]),
        timeout
      ]) as [Response, Response];

      console.log('📊 Réponses API reçues:', {
        creneauxStatus: creneauxRes.status,
        logsStatus: logsRes.status
      });

      // Traitement des créneaux
      if (creneauxRes.ok) {
        try {
          const creneauxData = await creneauxRes.json();
          console.log('✅ Créneaux chargés:', creneauxData.length);
          setCreneaux(Array.isArray(creneauxData) ? creneauxData : []);
        } catch (jsonError) {
          console.error('❌ Erreur parsing JSON créneaux:', jsonError);
          setCreneaux([]);
        }
      } else {
        console.error('❌ Erreur API créneaux:', creneauxRes.status, creneauxRes.statusText);
        // Essayer de lire le message d'erreur
        try {
          const errorData = await creneauxRes.json();
          console.error('❌ Détails erreur créneaux:', errorData);
          if (creneauxRes.status === 401) {
            setError('Session expirée. Reconnectez-vous.');
            return;
          }
        } catch {}
        setCreneaux([]);
      }

      // Traitement des logs
      if (logsRes.ok) {
        try {
          const logsData = await logsRes.json();
          console.log('✅ Logs chargés:', logsData.length);
          setLogs(Array.isArray(logsData) ? logsData : []);
        } catch (jsonError) {
          console.error('❌ Erreur parsing JSON logs:', jsonError);
          setLogs([]);
        }
      } else {
        console.error('❌ Erreur API logs:', logsRes.status, logsRes.statusText);
        // Essayer de lire le message d'erreur
        try {
          const errorData = await logsRes.json();
          console.error('❌ Détails erreur logs:', errorData);
        } catch {}
        setLogs([]);
      }

    } catch (error: any) {
      console.error('❌ Erreur lors du chargement:', error);
      setError(error.message || 'Erreur de chargement');
      // S'assurer que les états sont initialisés même en cas d'erreur
      setCreneaux([]);
      setLogs([]);
    } finally {
      console.log('🏁 Fin du chargement des données');
      loadingRef.current = false;
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
      } else {
        console.error('Erreur toggle:', response.status);
      }
    } catch (error) {
      console.error('Erreur lors du toggle:', error);
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
      } else {
        console.error('Erreur suppression:', response.status);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
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
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const user = getCurrentUser();
  
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-600">Chargement des données...</p>
          <p className="text-gray-500 text-sm mt-1">Cela peut prendre quelques secondes</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Erreur de chargement</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={chargerDonnees}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Auto-réservation
              </h2>
              <p className="text-gray-600 text-sm">
                Réservation automatique tous les jours à 20h
              </p>
            </div>
          </div>
          <button
            onClick={chargerDonnees}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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

        {/* Section créneaux programmés */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Créneaux programmés ({creneaux.length})
            </h3>
          </div>

          {creneaux.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Plus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-700 mb-2">
                Aucun créneau configuré
              </h4>
              <p className="text-gray-600 mb-4">
                Allez dans l'onglet Recherche, trouvez vos créneaux et cliquez sur "Auto"
              </p>
            </div>
          ) : (
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
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {creneau.jour}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {creneau.horaireDebut} - {creneau.horaireFin}
                        </span>
                      </div>

                      {creneau.localisation && (
                        <p className="text-xs text-gray-500 mb-2">
                          📍 {creneau.localisation.nom}
                        </p>
                      )}

                      {/* Statistiques */}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
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

        {/* Section historique récent */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Historique récent
            </h3>
            {logs.length > 0 && (
              <span className="text-sm text-gray-500">
                {logs.length} entrée{logs.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h4 className="text-base font-medium text-gray-700 mb-1">
                Aucun historique
              </h4>
              <p className="text-gray-600 text-sm">
                L'historique des tentatives de réservation apparaîtra ici
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {logs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-start gap-3">
                    {getStatutIcon(log.statut)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {log.activiteNom}
                        </h4>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-1">
                        {log.jour} {log.horaireDebut}
                      </p>
                      
                      <p className="text-sm text-gray-700">
                        {log.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {logs.length > 10 && (
                <div className="text-center py-2">
                  <p className="text-xs text-gray-500">
                    ... et {logs.length - 10} entrée{logs.length - 10 > 1 ? 's' : ''} de plus
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

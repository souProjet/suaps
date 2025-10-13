'use client';

import { useState } from 'react';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Search,
  Calendar,
  Users,
  Activity
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import LoadingSpinner from './LoadingSpinner';

interface AvailabilityStats {
  total: number;
  available: number;
  alreadyRegistered: number;
  errors: number;
}

interface AvailableSlot {
  activiteNom: string;
  jour: string;
  horaires: string;
  placesDisponibles: number;
  placesTotales: number;
}

interface CheckAvailabilityResult {
  success: boolean;
  message: string;
  stats: AvailabilityStats;
  availableSlots: AvailableSlot[];
  duration: number;
  timestamp: string;
}

interface CreneauAvailabilityCheckerProps {
  className?: string;
  userId?: string;
  showDetails?: boolean;
}

export default function CreneauAvailabilityChecker({ 
  className = '', 
  userId, 
  showDetails = false 
}: CreneauAvailabilityCheckerProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<CheckAvailabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const toast = useToast();

  const checkAvailability = async (detailed = false) => {
    if (!user) {
      toast.error('Vous devez être connecté pour vérifier la disponibilité');
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (userId) {
        params.set('userId', userId);
      }
      if (detailed || showDetails) {
        params.set('detailed', 'true');
      }

      const response = await fetch(`/api/auto-reservation/check-availability?${params}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result: CheckAvailabilityResult = await response.json();
      setLastResult(result);

      if (result.success) {
        if (result.stats.available > 0) {
          toast.success(
            `🎉 ${result.stats.available} place(s) disponible(s) trouvée(s) !`
          );
        } else if (result.stats.alreadyRegistered > 0) {
          toast.info(
            `ℹ️ Tous vos créneaux sont déjà réservés ou complets`
          );
        } else {
          toast.warning(
            `😔 Aucune place disponible pour le moment`
          );
        }
      } else {
        toast.error(result.message);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsChecking(false);
    }
  };

  const triggerManualCheck = async () => {
    if (!user) {
      toast.error('Vous devez être connecté pour déclencher une vérification');
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const body: any = { action: 'check-now' };
      if (userId) {
        body.userId = userId;
      }

      const response = await fetch('/api/auto-reservation/check-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result: CheckAvailabilityResult = await response.json();
      setLastResult(result);

      toast.success('Vérification manuelle terminée');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification manuelle';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsChecking(false);
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = (available: number, registered: number, errors: number) => {
    if (available > 0) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (errors > 0) return <XCircle className="w-5 h-5 text-red-500" />;
    if (registered > 0) return <AlertCircle className="w-5 h-5 text-blue-500" />;
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Vérification de disponibilité
          </h3>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => checkAvailability(false)}
            disabled={isChecking}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isChecking ? (
              <LoadingSpinner size="sm" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Vérifier maintenant
          </button>
          
          {showDetails && (
            <button
              onClick={triggerManualCheck}
              disabled={isChecking}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isChecking ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
              Vérification complète
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <XCircle className="w-4 h-4" />
            <span className="font-medium">Erreur</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {lastResult && (
        <div className="space-y-4">
          {/* Statistiques générales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total créneaux</p>
                  <p className="text-2xl font-bold text-gray-900">{lastResult.stats.total}</p>
                </div>
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Disponibles</p>
                  <p className="text-2xl font-bold text-green-700">{lastResult.stats.available}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Déjà inscrits</p>
                  <p className="text-2xl font-bold text-blue-700">{lastResult.stats.alreadyRegistered}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Erreurs</p>
                  <p className="text-2xl font-bold text-red-700">{lastResult.stats.errors}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </div>

          {/* Places disponibles */}
          {lastResult.availableSlots && lastResult.availableSlots.length > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Places disponibles ({lastResult.availableSlots.length})
              </h4>
              <div className="space-y-2">
                {lastResult.availableSlots.map((slot, index) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{slot.activiteNom}</p>
                        <p className="text-sm text-gray-600">
                          {slot.jour} • {slot.horaires}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          {slot.placesDisponibles} place(s)
                        </p>
                        <p className="text-xs text-gray-500">
                          sur {slot.placesTotales}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informations de la vérification */}
          <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {getStatusIcon(
                  lastResult.stats.available,
                  lastResult.stats.alreadyRegistered,
                  lastResult.stats.errors
                )}
                <span>{lastResult.message}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span>Durée: {formatDuration(lastResult.duration)}</span>
              <span>Dernière vérification: {formatTimestamp(lastResult.timestamp)}</span>
            </div>
          </div>
        </div>
      )}

      {!lastResult && !isChecking && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Cliquez sur "Vérifier maintenant" pour lancer une vérification de disponibilité</p>
          <p className="text-sm mt-1">
            Cette fonction vérifie si des places se sont libérées dans vos créneaux configurés
          </p>
        </div>
      )}

      {isChecking && (
        <div className="text-center py-8">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-3">Vérification en cours...</p>
          <p className="text-sm text-gray-500 mt-1">
            Connexion aux serveurs SUAPS et analyse des créneaux
          </p>
        </div>
      )}
    </div>
  );
}
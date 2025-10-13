# Endpoint de Vérification de Disponibilité

## Description

L'endpoint `/api/auto-reservation/check-availability` réimplémente la fonctionnalité du script `check-availabilty.js` dans l'API Next.js. Il permet de vérifier en temps réel la disponibilité des créneaux configurés pour l'auto-réservation.

## Endpoints

### GET `/api/auto-reservation/check-availability`

Vérifie la disponibilité de tous les créneaux configurés.

#### Paramètres de requête (optionnels)

- `userId` (string) : Filtrer les créneaux d'un utilisateur spécifique
- `detailed` (boolean) : Retourner les résultats détaillés (défaut: false)

#### Réponse

```json
{
  "success": true,
  "message": "Vérification terminée: X places disponibles trouvées sur Y créneaux",
  "stats": {
    "total": 5,
    "available": 2,
    "alreadyRegistered": 1,
    "errors": 0
  },
  "availableSlots": [
    {
      "activiteNom": "Badminton",
      "jour": "LUNDI",
      "horaires": "18:00-19:00",
      "placesDisponibles": 3,
      "placesTotales": 24
    }
  ],
  "duration": 2500,
  "timestamp": "2025-01-13T14:30:00.000Z"
}
```

#### Réponse détaillée (`detailed=true`)

Inclut également le champ `results` avec tous les créneaux testés :

```json
{
  "success": true,
  "message": "...",
  "results": [
    {
      "creneau": {
        "id": "creneau123",
        "userId": "user456",
        "activiteNom": "Badminton",
        "jour": "LUNDI",
        "horaireDebut": "18:00",
        "horaireFin": "19:00",
        // ... autres champs
      },
      "result": {
        "available": true,
        "placesTotales": 24,
        "placesOccupees": 21,
        "placesDisponibles": 3,
        "fileAttente": false
      }
    }
  ],
  // ... autres champs
}
```

### POST `/api/auto-reservation/check-availability`

Déclenche une vérification manuelle (nécessite une authentification).

#### Corps de la requête

```json
{
  "action": "check-now",
  "userId": "user456" // optionnel
}
```

#### Réponse

Même format que GET avec `detailed=true`.

## Fonctionnalités

### 🔍 Vérification en temps réel
- Connexion automatique à SUAPS avec les codes cartes configurés
- Vérification des places disponibles pour chaque créneau
- Détection des créneaux déjà réservés

### 🎯 Notifications Discord
- Notification automatique en cas de place disponible trouvée
- Messages structurés avec toutes les informations utiles
- Configuration via `DISCORD_WEBHOOK_URL`

### 📊 Statistiques complètes
- Nombre total de créneaux vérifiés
- Places disponibles trouvées
- Créneaux déjà réservés
- Erreurs rencontrées

### ⏱️ Optimisations
- Regroupement des créneaux par utilisateur
- Réutilisation des sessions de connexion
- Gestion des timeouts et erreurs

## Composant React

Le composant `CreneauAvailabilityChecker` fournit une interface utilisateur pour :

- Déclencher des vérifications manuelles
- Afficher les résultats en temps réel
- Visualiser les statistiques
- Voir les places disponibles

### Utilisation du composant

```tsx
import CreneauAvailabilityChecker from './CreneauAvailabilityChecker';

export default function MyPage() {
  return (
    <div>
      {/* Vérification simple */}
      <CreneauAvailabilityChecker />
      
      {/* Avec détails et utilisateur spécifique */}
      <CreneauAvailabilityChecker 
        userId="user123"
        showDetails={true}
        className="my-4"
      />
    </div>
  );
}
```

## Configuration

### Variables d'environnement

```bash
# URL de base SUAPS
SUAPS_BASE_URL=https://u-sport.univ-nantes.fr

# ID de période SUAPS
SUAPS_PERIODE_ID=4dc2c931-12c4-4cac-8709-c9bbb2513e16

# Webhook Discord pour les notifications (optionnel)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## Logique métier

### Calcul de la date cible

L'endpoint utilise la même logique que le script original pour calculer la date réelle du prochain créneau selon le système des "7 jours glissants" de SUAPS.

### Détection des inscriptions existantes

La fonction vérifie si l'utilisateur est déjà inscrit à un créneau en comparant :
- L'activité (ID)
- Le jour de la semaine
- Les horaires de début et fin
- La date réelle du créneau (si disponible)

### Gestion des erreurs

- Erreurs de connexion SUAPS
- Codes cartes invalides
- Timeouts des requêtes
- Erreurs de parsing des réponses

## Tests

### Script de test automatique

```bash
cd scripts
node test-availability-endpoint.js
```

### Test manuel via curl

```bash
# Test GET simple
curl -X GET "http://localhost:3000/api/auto-reservation/check-availability"

# Test GET avec détails
curl -X GET "http://localhost:3000/api/auto-reservation/check-availability?detailed=true"

# Test POST (nécessite authentification)
curl -X POST "http://localhost:3000/api/auto-reservation/check-availability" \
  -H "Content-Type: application/json" \
  -d '{"action": "check-now"}'
```

## Intégration avec l'existant

L'endpoint s'intègre parfaitement avec l'architecture existante :

- Utilise les mêmes fonctions utilitaires (`database.ts`, `codeConverter.ts`)
- Respecte le système d'authentification en place
- Compatible avec la base de données Prisma
- Suit les conventions de l'API Next.js

## Performance

- **Timeout configuré** : 5 minutes maximum (adaptable selon le plan Vercel)
- **Connexions optimisées** : Regroupement par utilisateur
- **Pauses entre requêtes** : 500ms pour éviter la surcharge
- **Fermeture propre** : Déconnexion automatique de la base de données

## Monitoring

L'endpoint génère des logs détaillés pour le monitoring :

- Début et fin de vérification avec timestamps
- Progression par utilisateur
- Résultats de chaque créneau
- Erreurs avec stack traces
- Durée totale d'exécution

## Migration depuis le script

Pour migrer du script `check-availabilty.js` vers l'endpoint :

1. **Remplacer les appels directs** au script par des requêtes HTTP
2. **Utiliser le composant React** pour l'interface utilisateur
3. **Configurer les mêmes variables d'environnement**
4. **Ajuster les tâches cron** pour appeler l'endpoint au lieu du script

L'endpoint offre les mêmes fonctionnalités avec en plus :
- Interface web intégrée
- Authentification et sécurité
- Intégration avec le système de notifications
- Meilleure gestion des erreurs
- Logs centralisés
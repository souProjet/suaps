# Planificateur SUAPS - Université de Nantes

Une application web interactive pour trouver des créneaux compatibles entre différentes activités sportives du SUAPS de l'Université de Nantes.

## 🚀 Fonctionnalités

- ✅ **Récupération automatique** des données depuis l'API SUAPS en temps réel
- ✅ **Cache intelligent** avec mise à jour automatique (1 semaine)
- ✅ **Sauvegarde des préférences** : vos choix sont automatiquement conservés
- ✅ **Sélection intuitive** des activités avec interface moderne et recherche
- ✅ **Contraintes horaires personnalisées** par jour de la semaine
- ✅ **Calcul automatique** des créneaux compatibles sans conflit
- ✅ **Affichage détaillé** des combinaisons possibles avec statistiques
- ✅ **Interface responsive** adaptée mobile/desktop
- ✅ **Gestion d'erreurs** et états de chargement élégants
- ✅ **Vue calendrier** pour visualiser les créneaux
- ✅ **Statistiques en temps réel** (activités, créneaux, compatibilité)
- ✅ **Expérience fluide** : reprise automatique de votre dernière session

## 📋 Prérequis

- Node.js 18 ou plus récent
- npm ou yarn
- Variables d'environnement pour l'API SUAPS (optionnel)

## 🛠️ Installation

1. **Cloner le projet**
```bash
git clone [votre-repo]
cd scraping-suaps
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration des variables d'environnement (optionnel)**
Créez un fichier `.env.local` à la racine du projet :
```env
SUAPS_API_URL=https://api.suaps.univ-nantes.fr/activites
SUAPS_PERIODE_ID=123
SUAPS_CATALOGUE_ID=456
```

4. **Lancer le serveur de développement**
```bash
npm run dev
# ou directement avec le script Windows
./start.bat
```

5. **Ouvrir votre navigateur**
   - Accédez à [http://localhost:3000](http://localhost:3000)
   - L'application se charge automatiquement

## 📱 Utilisation

### 🔄 Expérience fluide et cache intelligent

L'application mémorise automatiquement :
- 💾 **Votre ville sélectionnée** : pas besoin de la rechoisir à chaque visite
- 🕒 **Vos contraintes horaires** : vos disponibilités sont conservées
- 🏃 **Vos activités préférées** : la sélection est restaurée automatiquement
- 📍 **Votre progression** : reprise là où vous vous êtes arrêté

### 📋 Guide d'utilisation

1. **Sélection du campus** : Choisissez votre ville (sauvegardé automatiquement)
2. **Contraintes horaires** : Définissez vos disponibilités par jour de la semaine
3. **Sélection des activités** : Cochez les activités qui vous intéressent
4. **Résultats** : Consultez les créneaux compatibles sans conflit horaire

### 🔧 Fonctionnalités avancées

- 🔄 **Cache intelligent** : Les données SUAPS sont mises en cache pendant 1 semaine pour des performances optimales
- 💾 **Sauvegarde automatique** : Vos préférences sont conservées dans votre navigateur
- 🔄 **Actualisation manuelle** : Bouton "Actualiser" pour recharger les données si nécessaire
- 🗑️ **Réinitialisation** : Bouton pour effacer toutes les préférences sauvegardées

## 🏗️ Architecture

```
scraping-suaps/
├── app/
│   ├── api/
│   │   └── activites/
│   │       └── route.ts              # API pour récupérer les données SUAPS
│   ├── globals.css                   # Styles globaux avec Tailwind
│   ├── layout.tsx                    # Layout principal de l'application
│   └── page.tsx                      # Page principale interactive
├── components/
│   ├── ActivitySelector.tsx          # Sélecteur d'activités avec recherche
│   ├── CalendarView.tsx              # Vue calendrier des créneaux
│   ├── CreneauxResults.tsx           # Affichage des résultats de compatibilité
│   ├── HoraireConstraints.tsx        # Gestion des contraintes horaires
│   ├── LoadingSpinner.tsx            # Spinner de chargement élégant
│   └── SearchInput.tsx               # Composant de recherche
├── types/
│   └── suaps.ts                      # Types TypeScript pour l'API SUAPS
├── utils/
│   ├── storage.ts                    # Gestion du localStorage et du cache
│   └── suaps.ts                      # Logique métier (extraction, conflits, algorithmes)
├── hooks/
│   └── useUserPreferences.ts         # Hook pour la persistance des préférences
├── data_activites.json               # Cache local des données (si nécessaire)
├── start.bat                         # Script de démarrage Windows
└── package.json                      # Dépendances et scripts npm
```

## 🔧 Technologies utilisées

- **Next.js 14** - Framework React avec App Router et API Routes
- **TypeScript** - Typage statique strict pour une meilleure robustesse
- **Tailwind CSS** - Framework CSS utilitaire pour un design moderne
- **Lucide React** - Icônes modernes et cohérentes
- **API SUAPS** - Source de données en temps réel de l'université
- **React Hooks** - Gestion d'état moderne avec useMemo et useEffect

## 🎯 Améliorations par rapport au script Python original

### ✨ Interface utilisateur moderne :
- 🔍 **Recherche intelligente** avec autocomplétion et filtrage en temps réel
- 🎨 **Design responsive** avec composants optimisés mobile/desktop
- ⚡ **Animations fluides** et transitions élégantes
- 📱 **Interface tactile** adaptée à tous les écrans
- 🎯 **Sélection intuitive** avec statistiques en temps réel

### 🚀 Fonctionnalités avancées :
- 🔍 **Contraintes horaires personnalisées** par jour de la semaine
- 📊 **Statistiques détaillées** (compatibilité, nombre d'activités, créneaux)
- 🗓️ **Vue calendrier** pour visualiser les plannings
- 🎛️ **Tri et filtrage** des résultats par critères multiples
- 💡 **Interface contextuelle** avec aide et conseils
- ⭐ **Mise en avant** des meilleures combinaisons automatiquement

### 🛠️ Améliorations techniques :
- ⚡ **Performance optimisée** avec useMemo, React 18 et rendu conditionnel
- 💾 **Cache intelligent** avec revalidation automatique (1 semaine)
- 🏪 **Persistance des données** avec localStorage et hooks personnalisés
- 🎨 **CSS modulaire** avec classes utilitaires Tailwind et composants réutilisables
- 🔧 **Composants TypeScript** stricts avec interfaces complètes
- 🌐 **API RESTful** séparée avec gestion d'erreurs robuste
- 🎯 **Gestion d'état** centralisée et optimisée pour les performances

## 📊 API et Types de données

L'application utilise des types TypeScript stricts pour garantir la cohérence des données :

- **ActiviteAPI** : Structure des activités depuis l'API SUAPS
- **CreneauAPI** : Informations détaillées des créneaux (horaires, localisation)
- **ContraintesHoraires** : Gestion des disponibilités par jour
- **Combinaison** : Résultats de compatibilité entre activités

## 🚀 Déploiement en production

```bash
# Build optimisé pour la production
npm run build

# Démarrage du serveur de production
npm start
```

Pour un déploiement cloud, l'application est compatible avec :
- **Vercel** (recommandé pour Next.js)
- **Netlify**
- **Railway**
- **Docker** avec le Dockerfile généré par Next.js

## 🔧 Scripts disponibles

```bash
npm run dev      # Serveur de développement
npm run build    # Build de production  
npm run start    # Serveur de production
npm run lint     # Vérification du code
```

## 🤝 Contribution

N'hésitez pas à améliorer l'application en ajoutant :
- 📅 **Export en calendrier** (ICS, Google Calendar)
- 🔔 **Notifications** de changements de créneaux
- 🎨 **Thèmes personnalisés** (mode sombre)
- 📱 **Application mobile** avec React Native
- 🔄 **Synchronisation cloud** des préférences utilisateur
- 🔍 **Filtres avancés** (niveau, type d'activité)
- 📈 **Analytics** d'utilisation des créneaux

## 🤖 Auto-réservation

L'application inclut maintenant un système d'auto-réservation automatisé :

### ✨ Fonctionnalités de l'auto-réservation

- 🎯 **Réservation automatique** : Les créneaux sont automatiquement réservés 7 jours à l'avance
- ⏰ **Programmation intelligente** : Exécution quotidienne à 20h heure française (18h UTC)
- 🔐 **Authentification sécurisée** : Système d'authentification pour accéder aux fonctionnalités
- 📊 **Historique complet** : Suivi de toutes les tentatives et réservations
- 🎛️ **Gestion prioritaire** : Système de priorités pour les créneaux multiples
- 🔄 **Retry automatique** : Jusqu'à 3 tentatives en cas d'échec
- 📱 **API REST** : Endpoints pour gérer les créneaux d'auto-réservation

### 🚀 Configuration de l'auto-réservation

L'auto-réservation utilise un endpoint Next.js appelé par GitHub Actions :

1. **Endpoint API** : `/api/auto-reservation/execute`
2. **Programmation** : Workflow GitHub Actions avec cron à 18h UTC (20h France)
3. **Sécurité** : Authentification par token Bearer
4. **Logs** : Historique détaillé de toutes les opérations

### 🔧 Variables d'environnement requises

```env
# Secret pour l'auto-réservation (utilisé par GitHub Actions)
AUTO_RESERVATION_SECRET="your_secure_random_secret_here"

# URL de l'application (pour les appels d'endpoint)
AUTO_RESERVATION_URL="https://your-app-url.com"

# Base de données
DATABASE_URL="your_database_url_here"

# Configuration SUAPS
SUAPS_BASE_URL="https://u-sport.univ-nantes.fr"
```

### 📋 Secrets GitHub Actions

Configurez les secrets suivants dans votre repository GitHub :

- `AUTO_RESERVATION_SECRET` : Token d'authentification sécurisé
- `AUTO_RESERVATION_URL` : URL de votre application déployée

### 🎯 Utilisation

1. **Connexion** : Authentifiez-vous avec votre code carte SUAPS
2. **Ajout de créneaux** : Sélectionnez vos créneaux préférés et ajoutez-les à l'auto-réservation
3. **Configuration** : Définissez les priorités et options pour chaque créneau
4. **Automatisation** : Le système réserve automatiquement vos créneaux à 20h chaque jour

## 📋 Nouvelles fonctionnalités v2.0.0

- 🤖 **Auto-réservation automatisée** : Système complet d'auto-réservation des créneaux
- ⏰ **Programmation avancée** : Workflow GitHub Actions avec horaire français (20h)
- 🔐 **Système d'authentification** : Connexion sécurisée avec code carte SUAPS
- 📊 **Gestion des logs** : Historique détaillé de toutes les réservations
- 🎛️ **Interface de gestion** : Ajout/suppression/modification des créneaux automatiques
- ✨ **Cache intelligent** : Données mises en cache pendant 1 semaine pour des performances optimales
- 💾 **Sauvegarde automatique** : Vos préférences (ville, horaires, activités) sont conservées automatiquement
- 🔄 **Reprise de session** : L'application reprend là où vous vous êtes arrêté
- 🗑️ **Gestion des préférences** : Bouton pour effacer toutes les données sauvegardées
- ⚡ **Performance améliorée** : Chargement plus rapide grâce au cache côté serveur

## 📄 Licence

Ce projet est open source et disponible sous licence MIT. 
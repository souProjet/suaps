# Planificateur SUAPS - Université de Nantes

Une application web interactive pour trouver des créneaux compatibles entre différentes activités sportives du SUAPS de l'Université de Nantes.

## 🚀 Fonctionnalités

- ✅ **Récupération automatique** des données depuis l'API SUAPS en temps réel
- ✅ **Sélection intuitive** des activités avec interface moderne et recherche
- ✅ **Contraintes horaires personnalisées** par jour de la semaine
- ✅ **Calcul automatique** des créneaux compatibles sans conflit
- ✅ **Affichage détaillé** des combinaisons possibles avec statistiques
- ✅ **Interface responsive** adaptée mobile/desktop
- ✅ **Gestion d'erreurs** et états de chargement élégants
- ✅ **Vue calendrier** pour visualiser les créneaux
- ✅ **Statistiques en temps réel** (activités, créneaux, compatibilité)

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

1. **Contraintes horaires** : Définissez vos disponibilités par jour de la semaine
2. **Sélection des activités** : Cochez les activités qui vous intéressent dans la liste de gauche
3. **Recherche intelligente** : Utilisez la barre de recherche pour filtrer les activités
4. **Calcul automatique** : L'application trouve automatiquement toutes les combinaisons compatibles
5. **Visualisation** : Consultez les créneaux sans conflit horaire avec les détails de localisation
6. **Actualisation** : Utilisez le bouton "Actualiser" pour recharger les données SUAPS

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
│   └── suaps.ts                      # Logique métier (extraction, conflits, algorithmes)
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
- 💾 **Sauvegarde des préférences** utilisateur
- 🎨 **Thèmes personnalisés** (mode sombre)
- 📱 **Application mobile** avec React Native
- 🔄 **Synchronisation automatique** des données

## 📄 Licence

Ce projet est open source et disponible sous licence MIT. 
# Planificateur SUAPS - Université de Nantes

Une application web interactive pour trouver des créneaux compatibles entre différentes activités sportives du SUAPS de l'Université de Nantes.

## 🚀 Fonctionnalités

- ✅ Récupération automatique des données depuis l'API SUAPS
- ✅ Sélection intuitive des activités avec interface moderne
- ✅ Calcul automatique des créneaux compatibles
- ✅ Affichage détaillé des combinaisons possibles
- ✅ Interface responsive adaptée mobile/desktop
- ✅ Gestion d'erreurs et états de chargement

## 📋 Prérequis

- Node.js 18 ou plus récent
- npm ou yarn

## 🛠️ Installation

1. **Cloner ou utiliser ce projet**
```bash
cd scaping-suaps
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Lancer le serveur de développement**
```bash
npm run dev
```

4. **Ouvrir votre navigateur**
   - Accédez à [http://localhost:3000](http://localhost:3000)
   - L'application se charge automatiquement

## 📱 Utilisation

1. **Sélection des activités** : Cochez les activités qui vous intéressent dans la liste de gauche
2. **Calcul automatique** : L'application trouve automatiquement toutes les combinaisons compatibles
3. **Visualisation** : Consultez les créneaux sans conflit horaire dans la section de droite
4. **Actualisation** : Utilisez le bouton "Actualiser" pour recharger les données

## 🏗️ Architecture

```
scaping-suaps-nextjs/
├── app/
│   ├── api/activites/route.ts    # API pour récupérer les données SUAPS
│   ├── globals.css               # Styles globaux avec Tailwind
│   ├── layout.tsx                # Layout principal
│   └── page.tsx                  # Page principale interactive
├── components/
│   ├── ActivitySelector.tsx      # Sélecteur d'activités
│   ├── CreneauxResults.tsx      # Affichage des résultats
│   └── LoadingSpinner.tsx       # Spinner de chargement
├── types/
│   └── suaps.ts                 # Types TypeScript
├── utils/
│   └── suaps.ts                 # Logique métier (extraction, conflits)
└── package.json                 # Dépendances du projet
```

## 🔧 Technologies utilisées

- **Next.js 14** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utilitaire
- **Lucide React** - Icônes modernes
- **API SUAPS** - Source de données en temps réel

## 🎯 Amélioration par rapport au script Python

### ✨ Interface utilisateur moderne :
- 🔍 **Recherche intelligente** avec autocomplétion et suggestions
- 🎨 **Design glassmorphism** avec effets de flou et transparence
- ⚡ **Animations fluides** et transitions élégantes
- 📱 **Interface responsive** adaptée à tous les écrans
- 🎯 **Sélection intuitive** avec filtres et tri automatique

### 🚀 Fonctionnalités avancées :
- 🔍 **Recherche en temps réel** avec debouncing optimisé
- 📊 **Statistiques détaillées** (compatibilité, heures totales, jours utilisés)
- 📋 **Options d'export** (copie dans le presse-papier)
- 🎛️ **Tri et filtrage** des résultats
- 💡 **Conseils contextuel** et aide interactive
- ⭐ **Mise en avant** des meilleures combinaisons

### 🛠️ Améliorations techniques :
- ⚡ **Performance optimisée** avec useMemo et React 18
- 🎨 **CSS modulaire** avec classes utilitaires Tailwind
- 🔧 **Composants réutilisables** avec TypeScript strict
- 🌐 **API RESTful** séparée pour la récupération des données
- 🎯 **Gestion d'état** centralisée et optimisée

## 🚀 Déploiement en production

Pour déployer l'application :

```bash
npm run build
npm start
```

Ou déployez directement sur Vercel/Netlify pour un hébergement gratuit.

## 🤝 Contribution

N'hésitez pas à améliorer l'application en ajoutant :
- Filtres par jour de la semaine
- Export des créneaux en calendrier
- Notifications de conflits en temps réel
- Sauvegarde des préférences utilisateur

## 📄 Licence

Ce projet est open source et disponible sous licence MIT. 
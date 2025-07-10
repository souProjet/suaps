# 📱 PWA - Progressive Web App

Le Planificateur SUAPS est maintenant disponible comme une **Progressive Web App (PWA)** ! Cela signifie que vous pouvez l'installer sur votre téléphone ou ordinateur comme une application native.

## 🌟 Avantages de la PWA

- **🚀 Installation facile** : Installez directement depuis votre navigateur
- **📱 Interface native** : Expérience utilisateur comme une app mobile
- **⚡ Démarrage rapide** : Lance instantanément depuis l'écran d'accueil
- **🔄 Mode hors ligne** : Fonctionne même sans connexion internet (données en cache)
- **💾 Peu d'espace** : Plus léger qu'une app native traditionnelle
- **🔄 Mises à jour automatiques** : Toujours la dernière version

## 📲 Comment installer l'application

### Sur Android (Chrome/Edge)
1. Ouvrez l'application dans Chrome ou Edge
2. Appuyez sur le bouton **"Installer"** qui apparaît en bas de l'écran
3. Ou allez dans le menu ⋮ → "Installer l'application"
4. Confirmez l'installation
5. L'app apparaîtra sur votre écran d'accueil

### Sur iPhone/iPad (Safari)
1. Ouvrez l'application dans Safari
2. Appuyez sur le bouton de partage 📤 (en bas de l'écran)
3. Sélectionnez **"Sur l'écran d'accueil"**
4. Confirmez l'ajout
5. L'app sera disponible sur votre écran d'accueil

### Sur ordinateur (Chrome/Edge/Firefox)
1. Ouvrez l'application dans votre navigateur
2. Regardez dans la barre d'adresse pour l'icône d'installation 📥
3. Cliquez sur "Installer" ou utilisez le menu → "Installer SUAPS Planner"
4. L'app sera accessible depuis votre bureau ou menu démarrer

## 🛠️ Fonctionnalités PWA

### 📶 Mode hors ligne
- Les données précédemment consultées restent disponibles
- L'interface fonctionne même sans internet
- Synchronisation automatique dès que la connexion revient

### 🔔 Notifications (futures)
- Rappels de créneaux favoris
- Nouvelles activités disponibles
- Mises à jour importantes

### ⚡ Performance
- Chargement instantané après installation
- Cache intelligent des données
- Interface fluide et responsive

## 🎨 Icônes et apparence

L'application dispose d'icônes personnalisées pour tous les appareils :
- **72x72** à **512x512** pixels pour Android
- **Apple Touch Icon** pour iOS
- **Favicon** pour les navigateurs
- **Thème couleur** : Bleu (#3b82f6)

## 🔧 Configuration technique

### Manifest (manifest.json)
- **Nom** : "Planificateur SUAPS - Université de Nantes"
- **Nom court** : "SUAPS Planner"
- **Mode d'affichage** : Standalone (plein écran)
- **Orientation** : Portrait
- **Couleur de thème** : #3b82f6

### Service Worker (sw.js)
- **Cache statique** : Interface utilisateur, icônes
- **Cache API** : Données des activités et catalogues
- **Stratégie** : Network First avec fallback cache
- **Mises à jour** : Automatiques en arrière-plan

## 🚀 Développement

### Générer les icônes
```bash
npm run generate-icons
```

### Build PWA complet
```bash
npm run build-pwa
```

### Tester en local
```bash
npm run dev
```

### Vérifier l'installation PWA
1. Ouvrez les outils développeur (F12)
2. Onglet "Application" → "Manifest"
3. Vérifiez que le manifest se charge correctement
4. Testez l'installation avec "Add to homescreen"

## 📊 Audit PWA

Pour vérifier que la PWA respecte les standards :

1. **Lighthouse** (dans Chrome DevTools)
   - Ouvrez F12 → Lighthouse
   - Cochez "Progressive Web App"
   - Lancez l'audit

2. **Critères vérifiés** :
   - ✅ Manifest valide
   - ✅ Service Worker enregistré
   - ✅ HTTPS (en production)
   - ✅ Icônes appropriées
   - ✅ Interface responsive
   - ✅ Cache fonctionnel

## 🐛 Résolution de problèmes

### L'option d'installation n'apparaît pas
- Vérifiez que vous êtes sur HTTPS (ou localhost)
- Actualisez la page
- Vérifiez que l'app n'est pas déjà installée

### Cache bloqué
```javascript
// Dans la console du navigateur
caches.keys().then(names => names.forEach(name => caches.delete(name)));
navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(reg => reg.unregister()));
```

### Forcer la mise à jour
- Fermez complètement l'app
- Rouvrez-la (nouveau service worker se charge)
- Ou utilisez "Update on reload" dans DevTools

## 🔗 Ressources

- [MDN - Progressive Web Apps](https://developer.mozilla.org/fr/docs/Web/Progressive_web_apps)
- [Google - PWA Checklist](https://web.dev/pwa-checklist/)
- [Can I Use - PWA Support](https://caniuse.com/serviceworkers)

## 🎯 Prochaines étapes

- [ ] Notifications push pour nouveaux créneaux
- [ ] Synchronisation en arrière-plan
- [ ] Mode sombre automatique
- [ ] Raccourcis d'application (shortcuts)
- [ ] Partage natif des plannings
- [ ] Widget pour écran d'accueil (Android) 
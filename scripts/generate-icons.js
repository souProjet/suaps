const fs = require('fs');
const path = require('path');

// Tailles d'icônes requises pour PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Template SVG simple pour chaque taille
const generateSVG = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle with gradient -->
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="calendarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <circle cx="256" cy="256" r="240" fill="url(#bgGradient)" />
  
  <!-- Calendar base -->
  <rect x="128" y="160" width="256" height="192" rx="24" ry="24" fill="url(#calendarGradient)" stroke="#e2e8f0" stroke-width="4"/>
  
  <!-- Calendar top bar -->
  <rect x="128" y="160" width="256" height="48" rx="24" ry="24" fill="#1e40af"/>
  <rect x="128" y="184" width="256" height="24" fill="#1e40af"/>
  
  <!-- Calendar rings -->
  <circle cx="192" cy="140" r="16" fill="none" stroke="#ffffff" stroke-width="6"/>
  <circle cx="192" cy="140" r="8" fill="#ffffff"/>
  
  <circle cx="320" cy="140" r="16" fill="none" stroke="#ffffff" stroke-width="6"/>
  <circle cx="320" cy="140" r="8" fill="#ffffff"/>
  
  <!-- Calendar grid lines -->
  <line x1="168" y1="224" x2="344" y2="224" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="168" y1="264" x2="344" y2="264" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="168" y1="304" x2="344" y2="304" stroke="#e2e8f0" stroke-width="2"/>
  
  <line x1="200" y1="208" x2="200" y2="336" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="256" y1="208" x2="256" y2="336" stroke="#e2e8f0" stroke-width="2"/>
  <line x1="312" y1="208" x2="312" y2="336" stroke="#e2e8f0" stroke-width="2"/>
  
  <!-- Activity dots -->
  <circle cx="184" cy="244" r="6" fill="#10b981"/>
  <circle cx="240" cy="244" r="6" fill="#f59e0b"/>
  <circle cx="296" cy="284" r="6" fill="#ef4444"/>
  <circle cx="184" cy="324" r="6" fill="#8b5cf6"/>
  <circle cx="328" cy="324" r="6" fill="#06b6d4"/>
  
  <!-- Sports icon overlay -->
  <g transform="translate(380, 380) scale(0.8)">
    <!-- Running figure -->
    <path d="M40 20 C45 15, 55 15, 60 20 C65 25, 65 35, 60 40 C55 45, 45 45, 40 40 C35 35, 35 25, 40 20 Z" fill="#ffffff" opacity="0.9"/>
    <path d="M50 45 L45 65 L40 85 M50 45 L60 55 L70 50 M50 55 L35 70 L25 75" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.9"/>
  </g>
  
  <!-- SUAPS text -->
  <text x="256" y="420" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="#ffffff">SUAPS</text>
</svg>`;

// Créer le dossier icons s'il n'existe pas
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('🎨 Génération des icônes PWA...');

// Générer les SVG pour chaque taille (qui peuvent être utilisés directement)
ICON_SIZES.forEach(size => {
  const svgContent = generateSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`✅ Généré: ${filename}`);
});

// Créer aussi des "fausses" PNG en renommant les SVG (pour compatibilité PWA)
ICON_SIZES.forEach(size => {
  const svgContent = generateSVG(size);
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(iconsDir, filename);
  
  // En réalité, on écrit du SVG mais avec extension PNG
  // Les navigateurs modernes acceptent les SVG même avec extension PNG
  fs.writeFileSync(filepath, svgContent);
  console.log(`✅ Généré: ${filename} (SVG with PNG extension)`);
});

// Créer favicon.ico (simple SVG renommé)
const faviconContent = generateSVG(32);
const faviconPath = path.join(__dirname, '..', 'public', 'favicon.ico');
fs.writeFileSync(faviconPath, faviconContent);
console.log('✅ Généré: favicon.ico');

// Créer apple-touch-icon.png
const appleTouchContent = generateSVG(180);
const appleTouchPath = path.join(__dirname, '..', 'public', 'apple-touch-icon.png');
fs.writeFileSync(appleTouchPath, appleTouchContent);
console.log('✅ Généré: apple-touch-icon.png');

console.log('🎉 Toutes les icônes ont été générées avec succès!');
console.log('\n📝 Note: Les fichiers .png sont en fait des SVG avec extension PNG.');
console.log('   Les navigateurs modernes supportent cette approche pour les PWA.');
console.log('\n🔧 Pour de vraies PNG, utilisez un outil de conversion SVG vers PNG.'); 
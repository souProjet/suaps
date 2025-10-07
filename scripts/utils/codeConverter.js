// Wrapper JavaScript pour codeConverter.ts

/**
 * Convertit un code carte numérique SUAPS en format hexadécimal
 * Fonction extraite du système SUAPS officiel
 */
export function convertCodeCarteToHex(codeNumerique) {
  if (!codeNumerique || !/^\d+$/.test(codeNumerique)) {
    return codeNumerique; // Retourne tel quel si ce n'est pas numérique
  }

  // Conversion décimal vers hexadécimal
  const num = parseInt(codeNumerique, 10);
  let hex = num.toString(16).toUpperCase();
  
  // Ajouter un zéro au début si la longueur est impaire
  if (hex.length % 2 !== 0) {
    hex = "0" + hex;
  }
  
  return hex;
}

/**
 * Fonction inverse pour décoder un code hexadécimal vers décimal
 */
export function convertHexToCodeCarte(codeHex) {
  if (!codeHex || !/^[0-9A-Fa-f]+$/.test(codeHex)) {
    return codeHex; // Retourne tel quel si ce n'est pas hexadécimal
  }

  // Conversion hexadécimal vers décimal
  const num = parseInt(codeHex, 16);
  return num.toString();
}

/**
 * Fonction pour détecter et traiter automatiquement le type de code
 */
export function processCodeCarte(codeCarte) {
  // Nettoyer le code (enlever les espaces)
  const cleanCode = codeCarte.replace(/\s/g, '').trim();
  
  // Si le code contient des lettres (A-F), c'est probablement de l'hexa
  if (/[A-Fa-f]/.test(cleanCode)) {
    return cleanCode.toUpperCase(); // Déjà en hex, juste normaliser
  }
  
  // Si c'est numérique, le convertir en hexa
  if (/^\d+$/.test(cleanCode)) {
    return convertCodeCarteToHex(cleanCode);
  }
  
  // Sinon, retourner tel quel
  return cleanCode.toUpperCase();
}

/**
 * Valide si un code carte est dans un format acceptable
 */
export function validateCodeCarte(codeCarte) {
  if (!codeCarte || codeCarte.trim().length === 0) {
    return { isValid: false, message: 'Le code carte ne peut pas être vide' };
  }

  const cleanCode = codeCarte.replace(/\s/g, '').trim();

  // Vérifier si c'est numérique ou hexadécimal
  if (!/^[0-9A-Fa-f]+$/.test(cleanCode)) {
    return { 
      isValid: false, 
      message: 'Le code carte ne peut contenir que des chiffres et des lettres A-F' 
    };
  }

  // Vérifier la longueur (les codes SUAPS ont généralement entre 8 et 20 caractères)
  if (cleanCode.length < 8 || cleanCode.length > 20) {
    return { 
      isValid: false, 
      message: 'Le code carte doit contenir entre 8 et 20 caractères' 
    };
  }

  return { isValid: true };
}

/**
 * Formate un code carte pour l'affichage (ajoute des espaces pour la lisibilité)
 */
export function formatCodeCarteForDisplay(codeCarte) {
  const cleanCode = codeCarte.replace(/\s/g, '').trim();
  
  // Ajouter un espace tous les 4 caractères
  return cleanCode.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Détecte le type de code (numérique ou hexadécimal)
 */
export function detectCodeCarteType(codeCarte) {
  const cleanCode = codeCarte.replace(/\s/g, '').trim();
  
  if (/^\d+$/.test(cleanCode)) {
    return 'numeric';
  }
  
  if (/^[0-9A-Fa-f]+$/.test(cleanCode)) {
    return 'hex';
  }
  
  return 'unknown';
}
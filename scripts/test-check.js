#!/usr/bin/env node

console.log("🚀 Test script démarré");

// Test des imports
try {
  console.log("📦 Test import fetch...");
  const { default: fetch } = await import("node-fetch");
  console.log("✅ fetch importé avec succès");
  
  console.log("📦 Test import database...");
  const { getCreneauxAutoReservation } = await import("./utils/database.js");
  console.log("✅ database importé avec succès");
  
  console.log("📦 Test import codeConverter...");
  const { validateCodeCarte } = await import("./utils/codeConverter.js");
  console.log("✅ codeConverter importé avec succès");
  
  // Test connexion base de données
  console.log("🔍 Test récupération créneaux...");
  const creneaux = await getCreneauxAutoReservation();
  console.log(`✅ ${creneaux.length} créneaux trouvés`);
  
  if (creneaux.length > 0) {
    console.log("📋 Premier créneau:", {
      activiteNom: creneaux[0].activiteNom,
      jour: creneaux[0].jour,
      horaire: `${creneaux[0].horaireDebut}-${creneaux[0].horaireFin}`,
      userId: creneaux[0].userId
    });
  }
  
} catch (error) {
  console.error("❌ Erreur:", error.message);
  if (error.stack) {
    console.error("Stack:", error.stack);
  }
}

console.log("✅ Test terminé");
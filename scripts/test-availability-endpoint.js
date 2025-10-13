#!/usr/bin/env node

/**
 * Script de test pour l'endpoint de vérification de disponibilité
 * Usage: node test-availability-endpoint.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testAvailabilityEndpoint() {
  console.log('🧪 Test de l\'endpoint de vérification de disponibilité');
  console.log(`📍 Base URL: ${BASE_URL}`);
  
  try {
    // Test GET simple
    console.log('\n🔍 Test GET /api/auto-reservation/check-availability');
    const getResponse = await fetch(`${BASE_URL}/api/auto-reservation/check-availability`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Statut: ${getResponse.status} ${getResponse.statusText}`);
    
    if (getResponse.ok) {
      const result = await getResponse.json();
      console.log('✅ Réponse GET reçue:');
      console.log(`   - Success: ${result.success}`);
      console.log(`   - Message: ${result.message}`);
      console.log(`   - Stats:`, result.stats);
      console.log(`   - Places disponibles: ${result.availableSlots?.length || 0}`);
      console.log(`   - Durée: ${result.duration}ms`);
      
      if (result.availableSlots && result.availableSlots.length > 0) {
        console.log('🎉 Places disponibles trouvées:');
        result.availableSlots.forEach((slot, index) => {
          console.log(`   ${index + 1}. ${slot.activiteNom} - ${slot.jour} ${slot.horaires} (${slot.placesDisponibles}/${slot.placesTotales})`);
        });
      }
    } else {
      const errorText = await getResponse.text();
      console.log('❌ Erreur GET:', errorText);
    }
    
    // Test GET avec paramètres
    console.log('\n🔍 Test GET avec paramètre detailed=true');
    const detailedResponse = await fetch(`${BASE_URL}/api/auto-reservation/check-availability?detailed=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Statut detailed: ${detailedResponse.status} ${detailedResponse.statusText}`);
    
    if (detailedResponse.ok) {
      const detailedResult = await detailedResponse.json();
      console.log('✅ Réponse GET detailed reçue:');
      console.log(`   - Résultats détaillés: ${detailedResult.results?.length || 0} créneaux`);
      console.log(`   - Success: ${detailedResult.success}`);
      console.log(`   - Message: ${detailedResult.message}`);
    } else {
      const errorText = await detailedResponse.text();
      console.log('❌ Erreur GET detailed:', errorText);
    }
    
    // Test POST (nécessite authentification)
    console.log('\n🔍 Test POST /api/auto-reservation/check-availability');
    const postResponse = await fetch(`${BASE_URL}/api/auto-reservation/check-availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'check-now'
      })
    });
    
    console.log(`📊 Statut POST: ${postResponse.status} ${postResponse.statusText}`);
    
    if (postResponse.ok) {
      const postResult = await postResponse.json();
      console.log('✅ Réponse POST reçue:');
      console.log(`   - Success: ${postResult.success}`);
      console.log(`   - Message: ${postResult.message}`);
    } else {
      const errorText = await postResponse.text();
      console.log('⚠️  Erreur POST (probablement due à l\'authentification):', errorText);
    }
    
  } catch (error) {
    console.error('💥 Erreur lors du test:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Fonction pour tester la connectivité de base
async function testConnectivity() {
  console.log('\n🌐 Test de connectivité de base');
  
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET'
    });
    
    if (healthResponse.ok) {
      console.log('✅ Serveur accessible');
    } else {
      console.log(`⚠️  Serveur répond mais avec erreur: ${healthResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Serveur non accessible: ${error.message}`);
    console.log('💡 Assurez-vous que le serveur Next.js fonctionne (npm run dev)');
  }
}

// Fonction pour afficher des informations système
function showSystemInfo() {
  console.log('\n📋 Informations système:');
  console.log(`   - Node.js: ${process.version}`);
  console.log(`   - Platform: ${process.platform}`);
  console.log(`   - Architecture: ${process.arch}`);
  console.log(`   - Timestamp: ${new Date().toISOString()}`);
}

// Fonction principale
async function main() {
  console.log('🚀 Démarrage du test de l\'endpoint de vérification de disponibilité');
  console.log('=' .repeat(70));
  
  showSystemInfo();
  await testConnectivity();
  await testAvailabilityEndpoint();
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Test terminé');
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testAvailabilityEndpoint, testConnectivity };
import 'dotenv/config';
import { ChiefAcquisitionAI } from '../src/lib/agents/acquisition/ChiefAcquisitionAI';

async function run() {
  const chief = new ChiefAcquisitionAI();
  console.log("🚀 Lancement du Chief Acquisition AI...");
  
  // Lancer une mission réelle (Test à blanc sur 2 leads maximum)
  await chief.launchMission(
    "Test Acq Artisan",
    ["Bâtiment", "Artisan", "Toiture"],
    ["Charleroi", "Namur"],
    2 // maxLeads limité à 2 pour le test
  );

  console.log("✅ Ordre de mission généré et transmis au Market Scout. Surveille les logs de Purity OS !");
}

run().catch(console.error);

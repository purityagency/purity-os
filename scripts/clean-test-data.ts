import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function cleanTestData() {
  console.log("=== DÉBUT DU NETTOYAGE DES DONNÉES TEST & MOCKUP ===");

  // 1. Supprimer les éléments dépendants des Projets / Clients
  console.log("1. Suppression des messages...");
  const messagesDeleted = await prisma.message.deleteMany({});
  console.log(`   -> ${messagesDeleted.count} messages supprimés.`);

  console.log("2. Suppression des documents...");
  const documentsDeleted = await prisma.document.deleteMany({});
  console.log(`   -> ${documentsDeleted.count} documents supprimés.`);

  console.log("3. Suppression des paiements...");
  const paymentsDeleted = await prisma.payment.deleteMany({});
  console.log(`   -> ${paymentsDeleted.count} paiements supprimés.`);

  console.log("4. Suppression des étapes de projets (Stages)...");
  const stagesDeleted = await prisma.stage.deleteMany({});
  console.log(`   -> ${stagesDeleted.count} étapes supprimées.`);

  console.log("5. Suppression des événements / logs de l'Event Feed...");
  const eventsDeleted = await prisma.event.deleteMany({});
  console.log(`   -> ${eventsDeleted.count} événements supprimés.`);

  console.log("6. Suppression des projets test...");
  const projectsDeleted = await prisma.project.deleteMany({});
  console.log(`   -> ${projectsDeleted.count} projets supprimés.`);

  console.log("7. Suppression des tokens MagicLink pour les comptes clients test...");
  const tokensDeleted = await prisma.magicLinkToken.deleteMany({
    where: {
      user: {
        role: {
          not: "ADMIN",
        },
      },
    },
  });
  console.log(`   -> ${tokensDeleted.count} tokens supprimés.`);

  console.log("8. Suppression des comptes utilisateurs test (conservation de l'ADMIN)...");
  const usersDeleted = await prisma.user.deleteMany({
    where: {
      role: {
        not: "ADMIN",
      },
    },
  });
  console.log(`   -> ${usersDeleted.count} utilisateurs clients test supprimés.`);

  // Vérification de l'état final
  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });
  const remainingProjects = await prisma.project.count();
  const remainingEvents = await prisma.event.count();

  console.log("=== ÉTAT DE LA BASE DE DONNÉES APRÈS NETTOYAGE ===");
  console.log("Utilisateurs restants (ADMIN uniquement) :", remainingUsers);
  console.log("Projets restants :", remainingProjects);
  console.log("Événements restants :", remainingEvents);
  console.log("=== NETTOYAGE TERMINÉ AVEC SUCCÈS ===");
}

cleanTestData()
  .catch((e) => {
    console.error("Erreur lors du nettoyage :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

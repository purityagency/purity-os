import "dotenv/config"
import { prisma } from "../src/lib/prisma"
import { randomBytes, scryptSync } from "crypto"

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `scrypt$${salt}$${hash}`
}

async function main() {
  console.log("=== SIMULATION COMPTE CLIENT : AMIR KEBIYEB ===")

  // 1. Créer ou récupérer le Compte Client Amir Kebiyeb
  const email = "amir@purity-agency.be"
  const passwordHash = hashPassword("Salam6popo")

  let user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: "Amir Kebiyeb",
        passwordHash,
        role: "CLIENT",
        emailVerified: new Date()
      }
    })
    console.log(" Client créé :", user.email)
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: "Amir Kebiyeb",
        passwordHash,
        role: "CLIENT",
        emailVerified: new Date()
      }
    })
    console.log(" Client mis à jour :", user.email)
  }

  // 2. Nettoyer tout projet existant pour ce client pour une simulation propre
  await prisma.project.deleteMany({
    where: { clientId: user.id }
  })

  // 3. Créer le Projet Réel Simulé
  const estimatedDelivery = new Date()
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 7)

  const project = await prisma.project.create({
    data: {
      clientId: user.id,
      name: "Purity Agency — Refonte Vitrine & Bot IA 24/7",
      status: "IN_PROGRESS",
      sector: "Digital & Services Pro",
      externalOrderId: `ord_sim_${Date.now()}`,
      totalPrice: 1480.0,
      depositAmount: 444.0,
      remainingAmount: 1036.0,
      monthlyAmount: 39.0,
      estimatedDelivery,
      stages: {
        create: [
          {
            title: "01. Validation du Brief & Cahier des Charges",
            description: "Analyse des besoins métier, étude de la concurrence wallonne et validation des fonctionnalités.",
            status: "COMPLETED",
            orderIndex: 1
          },
          {
            title: "02. Design System Liquid Glass 2026",
            description: "Conception des maquettes UI, palette sombre #060309, typographies et composants interactifs.",
            status: "COMPLETED",
            orderIndex: 2
          },
          {
            title: "03. Développement Web & Intégration Mollie",
            description: "Implémentation du serveur Node.js natif, tunnel de commande modulable et webhooks de paiement.",
            status: "IN_PROGRESS",
            orderIndex: 3
          },
          {
            title: "04. Configuration Bot IA & Agent WhatsApp",
            description: "Entraînement du modèle IA sur les données de l'agence et déploiement du canal direct WhatsApp.",
            status: "WAITING_CLIENT",
            orderIndex: 4
          },
          {
            title: "05. Recette Finale & Mise en Production",
            description: "Vérification des performances Lighthouse 95+, audit de sécurité CSP et déploiement du domaine.",
            status: "PENDING",
            orderIndex: 5
          }
        ]
      },
      documents: {
        create: [
          {
            type: "INVOICE",
            url: "https://purity-agency.be/docs/proforma-089.pdf",
            filename: "Facture_Acompte_AmirKebiyeb.pdf",
            filesize: 245800,
            mimeType: "application/pdf",
            uploadedBy: "Purity Agency Billing"
          },
          {
            type: "ASSET",
            url: "https://purity-agency.be/docs/cahier-des-charges.pdf",
            filename: "Cahier_des_Charges_Purity.pdf",
            filesize: 1420900,
            mimeType: "application/pdf",
            uploadedBy: "Amir Kebiyeb"
          }
        ]
      },
      payments: {
        create: [
          {
            amount: 444.0,
            status: "PAID",
            type: "Acompte Commande Initial (30%)"
          }
        ]
      }
    }
  })

  console.log(" Projet créé avec succès :", project.name, `(ID: ${project.id})`)

  // 4. Ajouter les Messages dans la Discussion Projet
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" }
  })

  const adminId = adminUser ? adminUser.id : user.id

  await prisma.message.createMany({
    data: [
      {
        projectId: project.id,
        authorId: adminId,
        content: "Bonjour Amir ! Bienvenue sur votre Espace Client Purity OS. Votre projet de refonte et d'intégration IA est officiellement lancé.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
      },
      {
        projectId: project.id,
        authorId: user.id,
        content: "Super merci ! J'ai bien vérifié les maquettes et déposé le cahier des charges complémentaire dans la section Fichiers.",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
      },
      {
        projectId: project.id,
        authorId: adminId,
        content: "Parfait ! La phase 03 (Développement Web & Tunnel Mollie) est en cours d'achèvement. Tout est sur les rails pour la livraison estimée.",
        createdAt: new Date(Date.now() - 1000 * 60 * 30)
      }
    ]
  })

  console.log(" Discussion initialisée avec 3 messages.")
  console.log("=========================================")
  console.log(" COMPTE CLIENT OPÉRATIONNEL :")
  console.log(`- Email : ${email}`)
  console.log(`- Mot de passe : Salam6popo`)
  console.log(`- URL : http://localhost:3001/login`)
  console.log("=========================================")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

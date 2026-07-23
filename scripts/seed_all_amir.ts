import "dotenv/config"
import { prisma } from "../src/lib/prisma"
import { randomBytes, scryptSync } from "crypto"

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `scrypt$${salt}$${hash}`
}

async function main() {
  console.log("=== SYNCHRONISATION HUMANISÉE COMPTES AMIR KEBIYEB ===")

  const emails = ["amir.jobpro@gmail.com", "amir@purity-agency.be"]
  const passwordHash = hashPassword("Salam6popo")

  for (const email of emails) {
    let user = await prisma.user.findUnique({ where: { email } })

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
    }

    // Récupérer et nettoyer les anciens projets
    const existingProjects = await prisma.project.findMany({ where: { clientId: user.id } })
    for (const p of existingProjects) {
      await prisma.message.deleteMany({ where: { projectId: p.id } })
      await prisma.stage.deleteMany({ where: { projectId: p.id } })
      await prisma.document.deleteMany({ where: { projectId: p.id } })
      await prisma.payment.deleteMany({ where: { projectId: p.id } })
    }
    await prisma.project.deleteMany({ where: { clientId: user.id } })

    // Créer le projet concret & compréhensible
    const estimatedDelivery = new Date()
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7)

    const project = await prisma.project.create({
      data: {
        clientId: user.id,
        name: "Création de votre Site Web & Système de Réservation / Devis",
        status: "IN_PROGRESS",
        sector: "Restauration / BTP & Toiture / Artisan",
        externalOrderId: `ord_sim_${email.replace(/[^a-z0-9]/gi, '')}_${Date.now()}`,
        totalPrice: 1480.0,
        depositAmount: 444.0,
        remainingAmount: 1036.0,
        monthlyAmount: 39.0,
        estimatedDelivery,
        stages: {
          create: [
            {
              title: "1. Réception de vos textes, photos & horaires",
              description: "Nous avons bien récupéré votre logo, vos photos de réalisations/plats et vos coordonnées de contact.",
              status: "COMPLETED",
              orderIndex: 1
            },
            {
              title: "2. Création de la maquette visuelle de votre site",
              description: "Mise en page moderne adaptée sur smartphone et ordinateur avec vos couleurs d'entreprise.",
              status: "COMPLETED",
              orderIndex: 2
            },
            {
              title: "3. Programmation & Boutons de contact / réservation",
              description: "Installation du bouton d'appel direct, du formulaire de demande de devis et de la carte Google Maps.",
              status: "IN_PROGRESS",
              orderIndex: 3
            },
            {
              title: "4. Votre test & validation sur téléphone",
              description: "Action requise : Nous vous envoyons le lien pour tester votre site sur votre téléphone et valider les détails.",
              status: "WAITING_CLIENT",
              orderIndex: 4
            },
            {
              title: "5. Lancement officiel sur Internet & Google",
              description: "Votre site est officiellement publié sur Internet et référencé pour recevoir des nouveaux clients.",
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
              filename: "Facture_Acompte_Regle.pdf",
              filesize: 245800,
              mimeType: "application/pdf",
              uploadedBy: "Comptabilité Purity Agency"
            },
            {
              type: "ASSET",
              url: "https://purity-agency.be/docs/cahier-des-charges.pdf",
              filename: "Recapitulatif_Vos_Services.pdf",
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
              type: "Acompte de démarrage (30%)"
            }
          ]
        }
      }
    })

    // Messages simples et rassurants
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } })
    const adminId = adminUser ? adminUser.id : user.id

    await prisma.message.createMany({
      data: [
        {
          projectId: project.id,
          authorId: adminId,
          content: "Bonjour Amir ! Bienvenue sur votre espace. Votre projet de site internet est bien lancé. Toute notre équipe est à votre disposition.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
        },
        {
          projectId: project.id,
          authorId: user.id,
          content: "Bonjour ! J'ai bien vérifié, tout est clair. J'ai ajouté le récapitulatif de mes prestations dans l'onglet Photos & Documents.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
        },
        {
          projectId: project.id,
          authorId: adminId,
          content: "Parfait ! La programmation des formulaires et des boutons d'appel direct est presque terminée. On vous envoie le lien de test très vite.",
          createdAt: new Date(Date.now() - 1000 * 60 * 30)
        }
      ]
    })

    console.log(` Projet à langage clair attaché pour ${email}`)
  }

  console.log("=========================================")
  console.log(" SYNCHRONISATION HUMANISÉE TERMINÉE :")
  console.log(" 1) amir.jobpro@gmail.com  (Mdp: Salam6popo)")
  console.log(" 2) amir@purity-agency.be  (Mdp: Salam6popo)")
  console.log("=========================================")
}

main().finally(() => prisma.$disconnect())

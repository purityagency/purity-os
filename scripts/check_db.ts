import "dotenv/config"
import { prisma } from "../src/lib/prisma"

async function main() {
  const users = await prisma.user.findMany({
    include: { projects: true }
  })
  console.log("=== LISTE DES UTILISATEURS & PROJETS DANS LA BASE ===")
  users.forEach((u) => {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Role: ${u.role} | Projets (${u.projects.length}):`)
    u.projects.forEach(p => {
      console.log(`    ↳ Project ID: ${p.id} | Name: ${p.name} | Status: ${p.status}`)
    })
  })
}

main().finally(() => prisma.$disconnect())

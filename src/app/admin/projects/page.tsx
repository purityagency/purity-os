import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createProjectWithClient } from "@/actions/projectActions"
import Link from "next/link"

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { client: true }
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Projets & Clients</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
            <CardHeader>
              <CardTitle>Liste des Projets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.map(project => (
                  <Link href={`/admin/projects/${project.id}`} key={project.id} className="block">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-black/20 border border-white/5 hover:border-[#7C3AED]/50 transition-colors">
                      <div>
                        <div className="font-bold text-lg">{project.name}</div>
                        <div className="text-sm text-zinc-400">Client: {project.client.name} ({project.client.email})</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs px-2 py-1 rounded bg-[#7C3AED]/20 text-[#7C3AED] inline-block mb-1">
                          {project.status}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {project.estimatedDelivery ? new Date(project.estimatedDelivery).toLocaleDateString('fr-FR') : 'Pas de date'}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                {projects.length === 0 && (
                  <p className="text-sm text-zinc-500">Aucun projet trouvé.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-[#7C3AED]/10 border-[#7C3AED]/30 text-white backdrop-blur-md sticky top-8">
            <CardHeader>
              <CardTitle>Nouveau Projet</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createProjectWithClient} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nom du Client</Label>
                  <Input id="clientName" name="clientName" required className="bg-white/5 border-white/10" placeholder="Ex: Jean Dupont" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Email du Client</Label>
                  <Input id="clientEmail" name="clientEmail" type="email" required className="bg-white/5 border-white/10" placeholder="jean@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectName">Nom du Projet</Label>
                  <Input id="projectName" name="projectName" required className="bg-white/5 border-white/10" placeholder="Refonte Site Web" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedDelivery">Date de livraison estimée</Label>
                  <Input id="estimatedDelivery" name="estimatedDelivery" type="date" className="bg-white/5 border-white/10" />
                </div>
                <Button type="submit" className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
                  Créer le Projet
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

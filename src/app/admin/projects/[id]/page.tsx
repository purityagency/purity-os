import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addStageToProject } from "@/actions/stageActions"
import { TimelineInteractive } from "@/components/TimelineInteractive"
import { ProjectChat } from "@/components/ProjectChat"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"

export default async function AdminProjectDetailsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ""

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      stages: { orderBy: { orderIndex: "asc" } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: true } }
    }
  })

  if (!project) notFound()

  const addStage = addStageToProject.bind(null, project.id)

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-zinc-500 mb-2">Projet / {project.id}</div>
        <h1 className="text-3xl font-bold text-white">{project.name}</h1>
        <p className="text-zinc-400">Client: {project.client.name} ({project.client.email})</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
            <CardHeader>
              <CardTitle>Timeline &amp; Étapes</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineInteractive stages={project.stages} projectId={project.id} />
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
            <CardHeader>
              <CardTitle>Discussion avec le client</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectChat messages={project.messages} projectId={project.id} currentUserId={userId} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-[#7C3AED]/10 border-[#7C3AED]/30 text-white backdrop-blur-md">
            <CardHeader>
              <CardTitle>Ajouter une étape</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={addStage} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre de l&apos;étape</Label>
                  <Input id="title" name="title" required className="bg-white/5 border-white/10" placeholder="Ex: Design Maquette" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optionnelle)</Label>
                  <Input id="description" name="description" className="bg-white/5 border-white/10" placeholder="Validation des wireframes" />
                </div>
                <Button type="submit" className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
                  Ajouter
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

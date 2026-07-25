import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { addStageToProject } from "@/actions/stageActions"
import { updateProjectStatus, updateProjectDetails } from "@/actions/projectActions"
import { markPaymentPaid, markPaymentCancelled } from "@/actions/paymentActions"
import { TimelineInteractive } from "@/components/TimelineInteractive"
import { ProjectChat } from "@/components/ProjectChat"
import { ProjectDocuments } from "@/components/ProjectDocuments"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import Link from "next/link"

function formatEUR(amount: number) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  ON_HOLD: "En pause",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Acompte",
  BALANCE: "Solde",
  QUOTE: "Devis",
  INVOICE: "Facture",
  PAYMENT: "Paiement",
}

export default async function AdminProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ""
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      stages: { orderBy: { orderIndex: "asc" } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: true } },
      documents: { orderBy: { uploadedAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
    }
  })

  if (!project) notFound()

  const addStage = addStageToProject.bind(null, project.id)
  const updateDetails = updateProjectDetails.bind(null, project.id)

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link href="/admin/projects" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Tous les projets
          </Link>
          <h1 className="text-3xl font-bold text-white mt-2">{project.name}</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Client :{" "}
            <Link href={`/admin/clients/${project.clientId}`} className="text-[#C084FC] hover:underline">
              {project.client.name || project.client.email}
            </Link>
          </p>
        </div>
        <Badge className="bg-[#7C3AED]/20 text-[#7C3AED] text-sm px-3 py-1.5 h-auto">
          {STATUS_LABELS[project.status] ?? project.status}
        </Badge>
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

          <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectDocuments projectId={project.id} documents={project.documents} canUpload />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
            <CardHeader>
              <CardTitle>Statut du projet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const).map((status) => {
                const setStatus = updateProjectStatus.bind(null, project.id, status)
                const isCurrent = project.status === status
                return (
                  <form key={status} action={setStatus}>
                    <Button
                      type="submit"
                      disabled={isCurrent}
                      className={`w-full justify-start ${isCurrent
                        ? "bg-[#7C3AED] text-white opacity-100 cursor-default"
                        : "bg-white/5 hover:bg-white/10 text-zinc-300"}`}
                    >
                      {STATUS_LABELS[status]}
                    </Button>
                  </form>
                )
              })}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
            <CardHeader>
              <CardTitle>Modifier le projet</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateDetails} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du projet</Label>
                  <Input id="name" name="name" defaultValue={project.name} required className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedDelivery">Date de livraison estimée</Label>
                  <Input
                    id="estimatedDelivery"
                    name="estimatedDelivery"
                    type="date"
                    defaultValue={project.estimatedDelivery ? new Date(project.estimatedDelivery).toISOString().slice(0, 10) : ""}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <Button type="submit" className="w-full bg-white/10 hover:bg-white/20 text-white">
                  Enregistrer
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md">
            <CardHeader>
              <CardTitle>Finances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.totalPrice != null ? (
                <div className="text-sm space-y-1 text-zinc-400">
                  {project.sector && <p>Secteur : <span className="text-white">{project.sector}</span></p>}
                  <p>Prix total : <span className="text-white font-medium">{formatEUR(project.totalPrice)}</span></p>
                  {project.monthlyAmount != null && project.monthlyAmount > 0 && (
                    <p>Suivi mensuel : <span className="text-white font-medium">{formatEUR(project.monthlyAmount)}/mois</span></p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Projet créé manuellement — aucune donnée de commande.</p>
              )}

              <div className="space-y-2 pt-2 border-t border-white/5">
                {project.payments.length === 0 ? (
                  <p className="text-sm text-zinc-500">Aucun paiement enregistré.</p>
                ) : (
                  project.payments.map((payment: (typeof project.payments)[number]) => {
                    const markPaid = markPaymentPaid.bind(null, payment.id, project.id)
                    const markCancelled = markPaymentCancelled.bind(null, payment.id, project.id)
                    return (
                      <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 text-sm">
                        <div>
                          <div className="font-medium text-white">
                            {PAYMENT_TYPE_LABELS[payment.type] ?? payment.type} — {formatEUR(payment.amount)}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {new Date(payment.createdAt).toLocaleDateString('fr-BE')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {payment.status === "PENDING" ? (
                            <>
                              <form action={markPaid}>
                                <Button type="submit" className="h-7 px-2 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300">
                                  Marquer payé
                                </Button>
                              </form>
                              <form action={markCancelled}>
                                <Button type="submit" className="h-7 px-2 text-xs bg-white/5 hover:bg-white/10 text-zinc-400">
                                  Annuler
                                </Button>
                              </form>
                            </>
                          ) : (
                            <Badge className={payment.status === "PAID" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-zinc-400"}>
                              {payment.status === "PAID" ? "Payé" : "Annulé"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

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

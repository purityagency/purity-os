import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import Link from "next/link"

export default async function AdminClientsPage() {
  await requireAdminSession()
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    include: { projects: { orderBy: { updatedAt: "desc" }, take: 1 } },
  })

  return <div className="space-y-8">
    <div><h1 className="text-3xl font-bold text-white">Clients</h1><p className="mt-2 text-sm text-zinc-400">Chaque client regroupe son projet, ses documents, paiements et échanges.</p></div>
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {clients.length === 0 ? <p className="p-6 text-sm text-zinc-400">Aucun client enregistré.</p> : <div className="divide-y divide-white/10">{clients.map((client) => {
        const project = client.projects[0]
        return <Link key={client.id} href={project ? `/admin/projects/${project.id}` : "/admin/projects"} className="flex items-center justify-between gap-4 p-5 hover:bg-white/5">
          <div><p className="font-semibold text-white">{client.name || "Client sans nom"}</p><p className="text-sm text-zinc-400">{client.email}</p></div>
          <div className="text-right"><p className="text-sm text-zinc-200">{project?.name || "Aucun projet"}</p><p className="text-xs text-zinc-500">{project?.status || "À configurer"}</p></div>
        </Link>
      })}</div>}
    </div>
  </div>
}

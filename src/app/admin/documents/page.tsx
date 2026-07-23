import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"

export default async function AdminDocumentsPage() {
  await requireAdminSession()
  const documents = await prisma.document.findMany({
    orderBy: { uploadedAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  })

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Documents</h1>
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {documents.length === 0 ? (
          <p className="p-6 text-sm text-zinc-400">Aucun document envoyé.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {documents.map((document) => (
              <a key={document.id} href={`/api/documents/${document.id}`} className="flex items-center justify-between p-5 hover:bg-white/5">
                <div><p className="font-medium text-white">{document.filename}</p><p className="text-xs text-zinc-400">{document.project.name} · {document.type}</p></div>
                <span className="text-xs text-zinc-500">{new Date(document.uploadedAt).toLocaleDateString("fr-FR")}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

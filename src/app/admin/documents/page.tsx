import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { formatDate } from "@/lib/adminFormat"

const VALID_TYPES = ["INVOICE", "ASSET", "CONTRACT"] as const

const TYPE_LABELS: Record<string, string> = {
  INVOICE: "Facture",
  ASSET: "Fichier client",
  CONTRACT: "Contrat",
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  await requireAdminSession()
  const sp = await searchParams
  const typeFilter = VALID_TYPES.includes(sp.type as (typeof VALID_TYPES)[number]) ? sp.type : undefined

  const where: Prisma.DocumentWhereInput = typeFilter ? { type: typeFilter } : {}

  const documents = await prisma.document.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
    include: { project: { select: { id: true, name: true, client: { select: { name: true, email: true } } } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Documents</h1>
        <p className="mt-1 text-sm text-zinc-400">Fichiers échangés avec les clients, tous projets confondus.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/documents"
          aria-current={!typeFilter ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            !typeFilter ? "bg-[#7C3AED] text-white" : "border border-white/10 text-zinc-300 hover:bg-white/5"
          }`}
        >
          Tous
        </Link>
        {VALID_TYPES.map((type) => (
          <Link
            key={type}
            href={`/admin/documents?type=${type}`}
            aria-current={typeFilter === type ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              typeFilter === type ? "bg-[#7C3AED] text-white" : "border border-white/10 text-zinc-300 hover:bg-white/5"
            }`}
          >
            {TYPE_LABELS[type]}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {documents.length === 0 ? (
          <p className="p-6 text-sm text-zinc-400">
            {typeFilter ? "Aucun document de ce type." : "Aucun document envoyé."}
          </p>
        ) : (
          <div className="divide-y divide-white/10">
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-4 p-5 hover:bg-white/5 transition-colors">
                <div className="min-w-0">
                  <a
                    href={`/api/documents/${document.id}`}
                    className="font-medium text-white hover:text-[#C084FC] transition-colors truncate block"
                  >
                    {document.filename}
                  </a>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    <Link href={`/admin/projects/${document.project.id}`} className="hover:text-white transition-colors">
                      {document.project.name}
                    </Link>
                    {" · "}
                    {document.project.client.name || document.project.client.email}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-white/10 text-zinc-300 inline-block">
                    {TYPE_LABELS[document.type] ?? document.type}
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">
                    {formatFileSize(document.filesize)} · {formatDate(document.uploadedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

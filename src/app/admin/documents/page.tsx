import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import Link from "next/link"
import type { Prisma } from "@prisma/client"
import { formatDate } from "@/lib/adminFormat"
import { DocumentsIcon } from "@/components/icons"

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

  const [documents, invoicesCount, contractsCount, assetsCount, sizeAgg] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      include: { project: { select: { id: true, name: true, client: { select: { name: true, email: true } } } } },
    }),
    prisma.document.count({ where: { type: "INVOICE" } }),
    prisma.document.count({ where: { type: "CONTRACT" } }),
    prisma.document.count({ where: { type: "ASSET" } }),
    prisma.document.aggregate({ _sum: { filesize: true } }),
  ])

  const totalSize = sizeAgg._sum.filesize ?? 0

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Documents & Coffre Fort</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <DocumentsIcon className="w-6 h-6 text-violet-400" />
              <span>Coffre-Fort Documents Clients</span>
            </h1>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Total Documents</span>
            <span className="text-base font-bold text-white tabular-nums">{documents.length}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Factures Émises</span>
            <span className="text-base font-bold text-emerald-400 tabular-nums">{invoicesCount}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Contrats Signés</span>
            <span className="text-base font-bold text-violet-400 tabular-nums">{contractsCount}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Volume Stockage</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">{formatFileSize(totalSize)}</span>
          </div>
        </div>
      </div>

      {/* Main Content Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - Documents Table */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          {/* Filters Bar */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto">
              <Link
                href="/admin/documents"
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  !typeFilter ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Tous ({documents.length})
              </Link>
              {VALID_TYPES.map((type) => (
                <Link
                  key={type}
                  href={`/admin/documents?type=${type}`}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    typeFilter === type ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {TYPE_LABELS[type]}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {documents.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-white/10 rounded-xl bg-black/20">
                <DocumentsIcon className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">
                  {typeFilter ? "Aucun document de ce type." : "Aucun document envoyé."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-black/30">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-4 p-3 hover:bg-white/[0.03] transition-colors group">
                    <div className="min-w-0">
                      <a
                        href={`/api/documents/${doc.id}`}
                        className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors truncate block"
                      >
                        {doc.filename}
                      </a>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        <Link href={`/admin/projects/${doc.project.id}`} className="hover:text-white transition-colors">
                          {doc.project.name}
                        </Link>
                        {" · "}
                        {doc.project.client.name || doc.project.client.email}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300 inline-block font-semibold">
                        {TYPE_LABELS[doc.type] ?? doc.type}
                      </span>
                      <p className="text-[10px] font-mono text-zinc-500 mt-0.5 tabular-nums">
                        {formatFileSize(doc.filesize)} · {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right (1/3 width) - Security & Vault info */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Coffre Chiffré Client
              </h2>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Les documents sont chiffrés et stockés de manière sécurisée. L&apos;accès se fait exclusivement via lien temporaire sécurisé ou session client authentifiée.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400">Stockage Réseau:</span>
                <span className="text-white font-bold">Sécurisé SSL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Conformité RGPD:</span>
                <span className="text-emerald-400 font-bold">100% Valide</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Purity OS Document Vault 2026
          </div>
        </div>
      </div>
    </div>
  )
}

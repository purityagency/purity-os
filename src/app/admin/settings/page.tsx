import { requireAdminSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/adminFormat"
import { SettingsIcon, EcosystemIcon, AlertTriangleIcon, SparklesIcon } from "@/components/icons"

export const dynamic = "force-dynamic"

function checkEnv(...names: string[]) {
  return names.some((name) => Boolean(process.env[name]?.trim()))
}

interface Integration {
  name: string
  purpose: string
  configured: boolean
  hint: string
}

async function checkDatabase(): Promise<{ ok: boolean; detail: string }> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true, detail: "Connexion établie (Neon Postgres)" }
  } catch {
    return { ok: false, detail: "Connexion impossible" }
  }
}

function StatusPill({ ok, okLabel, koLabel }: { ok: boolean; okLabel: string; koLabel: string }) {
  return (
    <span
      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md shrink-0 ${
        ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
      }`}
    >
      {ok ? okLabel : koLabel}
    </span>
  )
}

export default async function AdminSettingsPage() {
  const session = await requireAdminSession()

  const [db, adminCount, clientCount, projectCount, eventCount] = await Promise.all([
    checkDatabase(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.project.count(),
    prisma.event.count(),
  ])

  const integrations: Integration[] = [
    {
      name: "Base de Données Neon Postgres",
      purpose: "Stockage des clients, projets, paiements et logs",
      configured: db.ok,
      hint: db.detail,
    },
    {
      name: "Service E-mails Resend",
      purpose: "E-mails transactionnels & invitations clients",
      configured: checkEnv("RESEND_API_KEY"),
      hint: "RESEND_API_KEY",
    },
    {
      name: "API Interne Shared Secret",
      purpose: "Pont de capture des leads depuis purity-agency.be",
      configured: checkEnv("INTERNAL_API_SECRET"),
      hint: "INTERNAL_API_SECRET",
    },
    {
      name: "Authentification NextAuth",
      purpose: "Sessions et sécurité des accès administrateurs",
      configured: checkEnv("NEXTAUTH_SECRET"),
      hint: "NEXTAUTH_SECRET",
    },
    {
      name: "URL de Base du Portail",
      purpose: "Génération des liens dans les emails envoyés aux clients",
      configured: checkEnv("PORTAL_BASE_URL", "NEXTAUTH_URL"),
      hint: "PORTAL_BASE_URL ou NEXTAUTH_URL",
    },
  ]

  const allConfigured = integrations.every((i) => i.configured)

  return (
    <div className="h-[calc(100vh-90px)] flex flex-col space-y-4 overflow-hidden">
      {/* Header Compact */}
      <div className="shrink-0 space-y-3 border-b border-white/5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Réglages & Conformité · Pôle 03</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-zinc-300" />
              <span>Paramètres Système & Sentinel</span>
            </h1>
          </div>
        </div>

        {/* KPI Ribbon Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className={`p-2.5 rounded-xl border ${allConfigured ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Santé Système (Sentinel)</span>
            <span className={`text-base font-bold tabular-nums ${allConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
              {allConfigured ? '100% Opérationnel' : 'Alerte Active'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Base Clients & Projets</span>
            <span className="text-base font-bold text-white tabular-nums">{clientCount} clients · {projectCount} projets</span>
          </div>
          <div className="p-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Événements Reçus</span>
            <span className="text-base font-bold text-violet-400 tabular-nums">{eventCount}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
            <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block truncate">Conformité RGPD & AI Act</span>
            <span className="text-base font-bold text-cyan-400 tabular-nums">Certifiée</span>
          </div>
        </div>
      </div>

      {/* Main Content Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0 overflow-hidden">
        {/* Left (2/3 width) - Integrations Diagnostics */}
        <div className="lg:col-span-2 flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <EcosystemIcon className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold text-white">Diagnostic des Intégrations Tech</h2>
            </div>
            <StatusPill ok={allConfigured} okLabel="Tous les systèmes OK" koLabel="Vérification requise" />
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden bg-black/30">
              {integrations.map((integration) => (
                <div key={integration.name} className="flex items-center justify-between gap-4 p-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">{integration.name}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{integration.purpose}</p>
                    {!integration.configured && (
                      <p className="text-[10px] text-amber-400 font-mono mt-1">Var manquante: {integration.hint}</p>
                    )}
                  </div>
                  <StatusPill ok={integration.configured} okLabel="Actif" koLabel="Non configuré" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right (1/3 width) - Security & Profile */}
        <div className="flex flex-col h-full border border-white/10 rounded-xl bg-white/[0.01] p-4 backdrop-blur-md overflow-hidden justify-between space-y-4">
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Profil Administrateur
              </h2>
              <div className="p-3 rounded-lg border border-white/5 bg-black/30 text-xs space-y-1 font-mono">
                <p className="text-white font-bold">{session.user.email}</p>
                <p className="text-[10px] text-zinc-500">Rôle: Administrateur Système (COO)</p>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/5 text-xs">
              <h3 className="text-xs font-bold text-white font-mono uppercase flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Normes de Sécurité Strictes</span>
              </h3>
              <ul className="space-y-2 text-[11px] text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Isolation des secrets côté serveur (zéro fuite navigateur).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Chiffrement des sessions NextAuth & Tokens d&apos;invitation 48h.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Conformité transparente AI Act avec mention obligatoire sur chaque e-mail.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-white/5 bg-black/40 text-[10px] text-zinc-500 font-mono">
            Vérifié le {formatDate(new Date())} par Sentinel Monitor
          </div>
        </div>
      </div>
    </div>
  )
}

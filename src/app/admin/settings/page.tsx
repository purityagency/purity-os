import { requireAdminSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/adminFormat"

export const dynamic = "force-dynamic"

// Vérifie la présence réelle des variables d'environnement, sans jamais exposer
// leur valeur. L'ancienne page affirmait "tout est configuré" en dur — ce qui
// masquait exactement le genre de panne silencieuse qu'on veut voir ici.
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
    return { ok: true, detail: "Connexion établie" }
  } catch {
    return { ok: false, detail: "Connexion impossible" }
  }
}

function StatusPill({ ok, okLabel, koLabel }: { ok: boolean; okLabel: string; koLabel: string }) {
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-lg font-medium shrink-0 ${
        ok ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
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
      name: "Base de données",
      purpose: "Stockage des clients, projets et demandes",
      configured: db.ok,
      hint: db.detail,
    },
    {
      name: "Resend",
      purpose: "E-mails transactionnels (invitations, notifications)",
      configured: checkEnv("RESEND_API_KEY"),
      hint: "RESEND_API_KEY",
    },
    {
      name: "API interne",
      purpose: "Réception des leads, RDV et commandes du site public",
      configured: checkEnv("INTERNAL_API_SECRET"),
      hint: "INTERNAL_API_SECRET — doit être identique côté site",
    },
    {
      name: "Authentification",
      purpose: "Sessions et connexion sécurisée",
      configured: checkEnv("NEXTAUTH_SECRET"),
      hint: "NEXTAUTH_SECRET",
    },
    {
      name: "URL du portail",
      purpose: "Liens dans les e-mails envoyés aux clients",
      configured: checkEnv("PORTAL_BASE_URL", "NEXTAUTH_URL"),
      hint: "PORTAL_BASE_URL ou NEXTAUTH_URL",
    },
  ]

  const allConfigured = integrations.every((i) => i.configured)

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Paramètres</h1>
        <p className="mt-1 text-sm text-zinc-400">État réel de votre espace Purity OS.</p>
      </div>

      {/* Profile */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Votre profil</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs text-zinc-500">E-mail</dt>
            <dd className="text-zinc-200 mt-0.5">{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Rôle</dt>
            <dd className="text-zinc-200 mt-0.5">Administrateur</dd>
          </div>
        </dl>
      </section>

      {/* Integrations health */}
      <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">Intégrations</h2>
            <p className="text-xs text-zinc-400 mt-1">
              {allConfigured ? "Tout est opérationnel." : "Une ou plusieurs intégrations demandent votre attention."}
            </p>
          </div>
          <StatusPill ok={allConfigured} okLabel="Opérationnel" koLabel="Attention" />
        </div>
        <ul className="divide-y divide-white/10">
          {integrations.map((integration) => (
            <li key={integration.name} className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{integration.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{integration.purpose}</p>
                {!integration.configured && (
                  <p className="text-[11px] text-amber-400/90 mt-1">À configurer : {integration.hint}</p>
                )}
              </div>
              <StatusPill ok={integration.configured} okLabel="Actif" koLabel="Manquant" />
            </li>
          ))}
        </ul>
      </section>

      {/* Data overview */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Contenu de l&apos;espace</h2>
        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <dt className="text-xs text-zinc-500">Clients</dt>
            <dd className="text-2xl font-bold text-white mt-0.5 tabular-nums">{clientCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Projets</dt>
            <dd className="text-2xl font-bold text-white mt-0.5 tabular-nums">{projectCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Demandes reçues</dt>
            <dd className="text-2xl font-bold text-white mt-0.5 tabular-nums">{eventCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Administrateurs</dt>
            <dd className="text-2xl font-bold text-white mt-0.5 tabular-nums">{adminCount}</dd>
          </div>
        </dl>
      </section>

      {/* Security */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Sécurité</h2>
        <ul className="mt-4 space-y-3 text-sm text-zinc-300">
          <li className="flex gap-3">
            <span className="text-emerald-400 shrink-0" aria-hidden="true">✓</span>
            <span>Les secrets restent exclusivement côté serveur, jamais exposés au navigateur.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-400 shrink-0" aria-hidden="true">✓</span>
            <span>L&apos;accès client se fait par lien à usage unique, valable 48h.</span>
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-400 shrink-0" aria-hidden="true">✓</span>
            <span>Les routes internes du site public exigent un secret partagé.</span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-zinc-500">Espace vérifié le {formatDate(new Date())}.</p>
      </section>
    </div>
  )
}

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)
  return <div className="max-w-3xl space-y-8">
    <div><h1 className="text-3xl font-bold text-white">Paramètres</h1><p className="mt-2 text-sm text-zinc-400">Configuration de ton espace Purity OS.</p></div>
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="text-lg font-semibold text-white">Ton profil</h2><p className="mt-3 text-sm text-zinc-300">{session?.user?.email}</p><p className="mt-1 text-xs text-zinc-500">Administrateur Purity Agency</p></section>
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="text-lg font-semibold text-white">Intégrations</h2><p className="mt-3 text-sm text-zinc-400">Mollie, Resend, Google Calendar et Neon sont configurés côté serveur.</p></section>
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6"><h2 className="text-lg font-semibold text-white">Sécurité</h2><p className="mt-3 text-sm text-zinc-400">Les secrets restent exclusivement côté serveur. La gestion multi-utilisateurs sera ajoutée quand l’équipe grandira.</p></section>
  </div>
}

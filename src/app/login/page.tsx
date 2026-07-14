"use client"

import { getSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [clientEmail, setClientEmail] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [clientError, setClientError] = useState("")
  const [adminError, setAdminError] = useState("")
  const [clientSuccess, setClientSuccess] = useState(false)
  const [clientLoading, setClientLoading] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setClientError("")
    setClientSuccess(false)
    setClientLoading(true)

    try {
      const response = await fetch("/api/client-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clientEmail }),
      })

      if (!response.ok) {
        setClientError("Impossible d'envoyer le lien pour le moment.")
        return
      }

      setClientSuccess(true)
    } catch {
      setClientError("Impossible d'envoyer le lien pour le moment.")
    } finally {
      setClientLoading(false)
    }
  }

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminError("")
    setAdminLoading(true)

    try {
      const result = await signIn("credentials", {
        email: adminEmail,
        password: adminPassword,
        redirect: false,
      })

      if (!result?.ok) {
        setAdminError("Identifiants invalides.")
        return
      }

      const session = await getSession()
      router.push(session?.user?.role === "ADMIN" ? "/admin" : "/dashboard")
      router.refresh()
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#060309] px-6 py-16 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <div className="mb-8">
            <div className="mb-2 text-[#7C3AED] text-sm font-semibold uppercase tracking-[0.2em]">Purity OS</div>
            <h1 className="text-3xl font-bold">Un seul portail. Une seule entrée.</h1>
            <p className="mt-3 text-zinc-400">
              Les clients reçoivent un lien magique. L&apos;équipe Purity se connecte avec email et mot de passe.
            </p>
          </div>

          <div className="rounded-2xl border border-[#7C3AED]/20 bg-[#7C3AED]/10 p-6">
            <h2 className="mb-2 text-xl font-bold">Accès client</h2>
            <p className="mb-5 text-sm text-zinc-300">
              Entrez l&apos;adresse liée à votre projet. Si votre portail est activé, vous recevrez un lien sécurisé.
            </p>

            <form onSubmit={handleClientSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Adresse e-mail</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7C3AED] focus:outline-none"
                  placeholder="client@purity.be"
                />
              </div>

              <Button type="submit" disabled={clientLoading} className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-3 rounded-lg transition-colors">
                {clientLoading ? "Envoi en cours..." : "Recevoir mon lien sécurisé"}
              </Button>

              {clientSuccess ? (
                <p className="text-sm text-emerald-300">
                  Si votre espace est actif, le lien vient d&apos;être envoyé.
                </p>
              ) : null}
              {clientError ? <p className="text-sm text-red-300">{clientError}</p> : null}
            </form>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <div className="mb-8">
            <div className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">Administration</div>
            <h2 className="text-2xl font-bold">Équipe Purity</h2>
            <p className="mt-3 text-zinc-400">
              Connexion réservée à l&apos;interne pour piloter les projets, documents et échanges.
            </p>
          </div>

          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7C3AED] focus:outline-none"
                placeholder="admin@purity.be"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Mot de passe</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#7C3AED] focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" disabled={adminLoading} className="w-full bg-white text-black hover:bg-zinc-200 py-3 rounded-lg transition-colors">
              {adminLoading ? "Connexion..." : "Connexion équipe"}
            </Button>
            {adminError ? <p className="text-sm text-red-300">{adminError}</p> : null}
          </form>
        </div>
      </div>
    </div>
  )
}

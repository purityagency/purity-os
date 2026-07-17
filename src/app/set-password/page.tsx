"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!token) {
      setError("Lien invalide. Demandez un nouveau lien à l'équipe Purity Agency.")
      return
    }
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.")
      return
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === "invalid_or_expired_token") setError("Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau à l'équipe.")
        else if (data.error === "rate_limited") setError("Trop de tentatives. Réessayez dans quelques minutes.")
        else setError("Une erreur est survenue.")
        setLoading(false)
        return
      }
      setSuccess(true)
      setTimeout(() => router.push("/login"), 2000)
    } catch {
      setError("Connexion impossible. Réessayez.")
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[430px] backdrop-blur-2xl bg-white/[0.02] border border-white/[0.1] rounded-[24px] p-8 shadow-2xl relative z-10">
      <h2 className="text-xl font-bold tracking-wide text-white">Définir votre mot de passe</h2>
      <p className="mt-2 text-zinc-400 text-xs leading-relaxed">
        Choisissez un mot de passe pour accéder à votre espace client Purity Agency.
      </p>

      {success ? (
        <div className="mt-6 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-sm">
          Mot de passe défini. Redirection vers la connexion...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Nouveau mot de passe (8 caractères min.)"
            className="w-full rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#A855F7] focus:outline-none focus:ring-1 focus:ring-[#A855F7]/30 transition-all"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            placeholder="Confirmer le mot de passe"
            className="w-full rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#A855F7] focus:outline-none focus:ring-1 focus:ring-[#A855F7]/30 transition-all"
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-white text-black hover:bg-zinc-200 text-xs font-semibold py-3.5 rounded-full transition-all uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? "Enregistrement..." : "Définir le mot de passe"}
          </Button>
          {error ? (
            <div className="mt-2 p-3 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs">
              ✕ {error}
            </div>
          ) : null}
        </form>
      )}
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <div className="relative min-h-screen bg-[#060309] flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#A855F7]/12 rounded-full blur-[140px] pointer-events-none" />
      <div className="mb-10 text-center z-10 flex flex-col items-center">
        <span className="font-bold text-2xl tracking-[0.16em] text-white">PURITY</span>
        <span className="font-medium text-[9px] tracking-[13px] -mr-[13px] mt-1 text-white/90">AGENCY</span>
      </div>
      <Suspense fallback={null}>
        <SetPasswordForm />
      </Suspense>
    </div>
  )
}

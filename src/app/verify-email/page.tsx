"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error")
  const [error, setError] = useState(token ? "" : "Lien invalide.")

  useEffect(() => {
    if (!token) return

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          if (data.error === "invalid_or_expired_token") setError("Ce lien a expiré ou a déjà été utilisé. Redemandez un email de confirmation depuis la page de connexion.")
          else if (data.error === "rate_limited") setError("Trop de tentatives. Réessayez dans quelques minutes.")
          else setError("Une erreur est survenue.")
          setStatus("error")
          return
        }
        setStatus("success")
        setTimeout(() => router.push("/login"), 2500)
      })
      .catch(() => {
        setError("Connexion impossible. Réessayez.")
        setStatus("error")
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="w-full max-w-[430px] backdrop-blur-2xl bg-white/[0.02] border border-white/[0.1] rounded-[24px] p-8 shadow-2xl relative z-10 text-center">
      <h2 className="text-xl font-bold tracking-wide text-white">Confirmation d&apos;e-mail</h2>

      {status === "loading" && (
        <p className="mt-4 text-zinc-400 text-sm">Vérification en cours...</p>
      )}
      {status === "success" && (
        <div className="mt-6 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-sm">
          E-mail confirmé ! Redirection vers la connexion...
        </div>
      )}
      {status === "error" && (
        <div className="mt-6 p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="relative min-h-screen bg-[#060309] flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#A855F7]/12 rounded-full blur-[140px] pointer-events-none" />
      <div className="mb-10 text-center z-10 flex flex-col items-center">
        <span className="font-bold text-2xl tracking-[0.16em] text-white">PURITY</span>
        <span className="font-medium text-[9px] tracking-[13px] -mr-[13px] mt-1 text-white/90">AGENCY</span>
      </div>
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}

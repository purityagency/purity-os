"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function MagicLoginClient({ token }: { token: string | null }) {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "error">(token ? "loading" : "error")

  useEffect(() => {
    if (!token) return

    signIn("magic-link", {
      token,
      redirect: false,
    }).then((result) => {
      if (!result?.ok) {
        setStatus("error")
        return
      }
      router.replace("/dashboard")
      router.refresh()
    }).catch(() => setStatus("error"))
  }, [router, token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060309] text-white p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
        {status === "loading" ? (
          <>
            <h1 className="text-2xl font-bold mb-3">Connexion sécurisée</h1>
            <p className="text-zinc-400">Ouverture de votre espace client…</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-3">Lien invalide ou expiré</h1>
            <p className="text-zinc-400 mb-6">Demandez un nouveau lien depuis la page de connexion.</p>
            <a href="/login" className="inline-flex rounded-full bg-[#7C3AED] px-5 py-2 text-white">
              Retour à la connexion
            </a>
          </>
        )}
      </div>
    </div>
  )
}

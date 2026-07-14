"use client"

import { getSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"client" | "admin">("client")
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
    } catch {
      setAdminError("Une erreur est survenue lors de la connexion.")
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#060309] flex flex-col items-center justify-center p-6 text-white overflow-hidden select-none">
      
      {/* ── DESIGN SYSTEM AURA & GLOW (2026-2027 Era) ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#7C3AED]/12 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#7C3AED]/5 rounded-full blur-[90px] pointer-events-none" />

      {/* ── OCTOMASK TENTACLE BACKGROUND SVG (Fine lines - Opacity 3%) ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <svg className="w-[850px] h-[850px] opacity-[0.03] text-white" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.12">
          {/* Central Mask Outline */}
          <polygon points="50,25 65,40 58,70 42,70 35,40" />
          <circle cx="50" cy="45" r="8" />
          <polygon points="45,43 50,38 55,43" />
          {/* Outer geometric orbits / tentacles */}
          <circle cx="50" cy="50" r="30" strokeDasharray="3 6" />
          <circle cx="50" cy="50" r="42" />
          <path d="M50,10 L50,25 M50,75 L50,90 M10,50 L25,50 M75,50 L90,50" />
          <path d="M22,22 L35,35 M65,65 L78,78 M78,22 L65,35 M35,65 L22,78" />
          <path d="M50,45 Q40,30 20,40 M50,45 Q60,30 80,40 M50,45 Q30,60 15,70 M50,45 Q70,60 85,70" />
        </svg>
      </div>

      {/* ── PORTAL BRANDING ── */}
      <div className="mb-8 text-center z-10">
        <div className="text-2xl font-bold tracking-[0.25em] font-sans">
          PURITY<span className="text-[#7C3AED]">.</span>OS
        </div>
        <p className="text-zinc-500 text-xs mt-2 uppercase tracking-[0.15em]">Unified Agency Gateway</p>
      </div>

      {/* ── CARD LOGIN (Liquid Glass Effect) ── */}
      <div className="w-full max-w-[430px] backdrop-blur-2xl bg-white/[0.015] border border-white/[0.08] rounded-3xl p-8 shadow-2xl relative z-10 transition-all duration-500 hover:border-white/[0.12]">
        
        {/* Fine Glass Reflection Line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        {/* ── SWITCHER (Sliding Tab Button) ── */}
        <div className="relative bg-white/[0.03] border border-white/[0.05] rounded-full p-1 flex mb-8">
          
          {/* Dynamic background pill */}
          <div 
            className="absolute top-1 bottom-1 rounded-full bg-white/[0.07] border border-white/[0.08] shadow transition-all duration-300 ease-out"
            style={{
              left: activeTab === "client" ? "4px" : "50%",
              right: activeTab === "client" ? "50%" : "4px",
            }}
          />

          <button
            type="button"
            onClick={() => setActiveTab("client")}
            className={`w-1/2 py-2.5 text-xs font-semibold rounded-full relative z-10 transition-colors duration-200 uppercase tracking-wider ${activeTab === "client" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Espace Client
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            className={`w-1/2 py-2.5 text-xs font-semibold rounded-full relative z-10 transition-colors duration-200 uppercase tracking-wider ${activeTab === "admin" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Équipe
          </button>
        </div>

        {/* ── FORM CLIENT (Magic Link) ── */}
        {activeTab === "client" ? (
          <div className="animate-fadeIn duration-300">
            <h2 className="text-xl font-bold font-sans">Accès client sécurisé</h2>
            <p className="mt-2 text-zinc-400 text-xs leading-relaxed">
              Entrez l&apos;adresse mail associée à votre projet. Un lien d&apos;accès direct et sécurisé vous sera envoyé instantanément.
            </p>

            <form onSubmit={handleClientSubmit} className="mt-6 space-y-5">
              <div className="relative group">
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  required
                  placeholder="client@domaine.com"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30 transition-all"
                />
              </div>

              <Button 
                type="submit" 
                disabled={clientLoading} 
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold py-3 rounded-xl transition-all shadow-lg shadow-[#7C3AED]/20 uppercase tracking-wider disabled:opacity-50"
              >
                {clientLoading ? "Génération du lien..." : "Recevoir mon lien magique"}
              </Button>

              {clientSuccess ? (
                <div className="mt-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs leading-relaxed">
                  ✓ Si l&apos;adresse correspond à un projet actif, le lien vient d&apos;être envoyé. Vérifiez votre boîte de réception (et vos spams).
                </div>
              ) : null}
              {clientError ? (
                <div className="mt-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 text-xs">
                  ✕ {clientError}
                </div>
              ) : null}
            </form>
          </div>
        ) : (
          /* ── FORM ADMIN (Credentials) ── */
          <div className="animate-fadeIn duration-300">
            <h2 className="text-xl font-bold font-sans">Console équipe</h2>
            <p className="mt-2 text-zinc-400 text-xs leading-relaxed">
              Réservé à l&apos;administration interne de Purity Agency pour gérer les projets, documents et workflows.
            </p>

            <form onSubmit={handleAdminSubmit} className="mt-6 space-y-4">
              <div>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  placeholder="Identifiant"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30 transition-all"
                />
              </div>

              <div>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  placeholder="Mot de passe"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#7C3AED] focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30 transition-all"
                />
              </div>

              <Button 
                type="submit" 
                disabled={adminLoading} 
                className="w-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold py-3 rounded-xl transition-all shadow-lg uppercase tracking-wider disabled:opacity-50"
              >
                {adminLoading ? "Authentification..." : "Accéder à la console"}
              </Button>

              {adminError ? (
                <div className="mt-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 text-xs">
                  ✕ {adminError}
                </div>
              ) : null}
            </form>
          </div>
        )}
      </div>

      {/* ── FOOTER SUBTLE LINKS ── */}
      <div className="mt-8 text-center z-10 text-[10px] text-zinc-600 tracking-wider">
        <a href="https://purity-agency.be" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">
          RETOUR AU SITE PRINCIPAL
        </a>
      </div>
    </div>
  )
}

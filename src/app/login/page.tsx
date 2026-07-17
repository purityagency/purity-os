"use client"

import { getSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"

function authErrorMessage(error: string | null | undefined, fallback: string) {
  if (error === "rate_limited") return "Trop de tentatives. Réessayez dans quelques minutes."
  if (error === "email_not_verified") return "Confirmez d'abord votre e-mail (lien envoyé à l'inscription)."
  return fallback
}

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"client" | "admin">("client")
  const [clientMode, setClientMode] = useState<"login" | "register">("login")

  // Client login states
  const [clientEmail, setClientEmail] = useState("")
  const [clientPassword, setClientPassword] = useState("")
  const [clientError, setClientError] = useState("")
  const [clientLoading, setClientLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  // Register states
  const [regName, setRegName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regHoneypot, setRegHoneypot] = useState("")
  const [regError, setRegError] = useState("")
  const [regLoading, setRegLoading] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)

  // Admin states
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [adminError, setAdminError] = useState("")
  const [adminLoading, setAdminLoading] = useState(false)

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setClientError("")
    setNeedsVerification(false)
    setResendSent(false)
    setClientLoading(true)

    try {
      const result = await signIn("credentials", {
        email: clientEmail,
        password: clientPassword,
        redirect: false,
      })

      if (!result?.ok) {
        if (result?.error === "email_not_verified") setNeedsVerification(true)
        setClientError(authErrorMessage(result?.error, "Identifiants invalides."))
        setClientLoading(false)
        return
      }

      const session = await getSession()
      router.push(session?.user?.role === "ADMIN" ? "/admin" : "/dashboard")
      router.refresh()
    } catch {
      setClientError("Une erreur est survenue.")
      setClientLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResendSent(false)
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clientEmail }),
      })
    } catch {
      /* réponse toujours générique côté serveur, rien à faire ici */
    } finally {
      setResendSent(true)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError("")

    if (regPassword.length < 8) {
      setRegError("Le mot de passe doit faire au moins 8 caractères.")
      return
    }

    setRegLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, website: regHoneypot }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === "email_taken") setRegError("Un compte existe déjà pour cet e-mail. Connectez-vous.")
        else if (data.error === "password_too_short") setRegError("Le mot de passe doit faire au moins 8 caractères.")
        else if (data.error === "name_required") setRegError("Le nom est requis.")
        else if (data.error === "rate_limited") setRegError("Trop de tentatives. Réessayez dans quelques minutes.")
        else setRegError("Une erreur est survenue.")
        setRegLoading(false)
        return
      }
      setRegSuccess(true)
    } catch {
      setRegError("Connexion impossible. Réessayez.")
      setRegLoading(false)
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
        setAdminError(authErrorMessage(result?.error, "Identifiants invalides."))
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
      
      {/* ── DESIGN SYSTEM AURA & GLOW (Official Mauve #A855F7) ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#A855F7]/12 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#A855F7]/5 rounded-full blur-[90px] pointer-events-none" />

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

      {/* ── PORTAL BRANDING (Official Logo Style) ── */}
      <div className="mb-10 text-center z-10 flex flex-col items-center select-none cursor-default group transition-transform duration-300 hover:scale-[1.03]">
        <span className="font-bold text-2xl tracking-[0.16em] text-white" style={{ fontFamily: "var(--font-heading)" }}>PURITY</span>
        <span className="font-medium text-[9px] tracking-[13px] -mr-[13px] mt-1 text-white/90" style={{ fontFamily: "var(--font-heading)" }}>AGENCY</span>
      </div>

      {/* ── CARD LOGIN (Liquid Glass Effect matching --c-border) ── */}
      <div className="w-full max-w-[430px] backdrop-blur-2xl bg-white/[0.02] border border-white/[0.1] rounded-[24px] p-8 shadow-2xl relative z-10 transition-all duration-300 hover:border-white/[0.15]">
        
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
            onClick={() => { setActiveTab("client"); setClientError(""); }}
            className={`w-1/2 py-2.5 text-xs font-semibold rounded-full relative z-10 transition-colors duration-200 uppercase tracking-wider ${activeTab === "client" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Espace Client
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("admin"); setAdminError(""); }}
            className={`w-1/2 py-2.5 text-xs font-semibold rounded-full relative z-10 transition-colors duration-200 uppercase tracking-wider ${activeTab === "admin" ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Équipe
          </button>
        </div>

        {/* ── FORM CLIENT ── */}
        {activeTab === "client" ? (
          <div className="animate-fadeIn duration-300">
            {clientMode === "login" ? (
              <>
                <h2 className="text-xl font-bold font-heading tracking-wide">
                  Accès client sécurisé
                </h2>
                <p className="mt-2 text-zinc-400 text-xs leading-relaxed font-sans">
                  Entrez vos identifiants pour accéder à votre espace projet.
                </p>

                <form onSubmit={handleClientSubmit} className="mt-6 space-y-4">
                  <div>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      required
                      placeholder="client@domaine.com"
                      className="w-full rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#A855F7] focus:outline-none focus:ring-1 focus:ring-[#A855F7]/30 transition-all font-sans"
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      required
                      placeholder="Mot de passe"
                      className="w-full rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#A855F7] focus:outline-none focus:ring-1 focus:ring-[#A855F7]/30 transition-all font-sans"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={clientLoading}
                    className="w-full mt-2 bg-transparent hover:bg-transparent border border-white/80 hover:border-[#A855F7]/90 hover:shadow-[0_0_18px_rgba(168,85,247,0.45),0_0_4px_rgba(168,85,247,0.25)] text-white text-xs font-semibold py-3.5 rounded-full transition-all uppercase tracking-wider disabled:opacity-50 font-sans hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {clientLoading ? "Connexion..." : "Se connecter"}
                  </Button>

                  {clientError ? (
                    <div className="mt-4 p-3 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs font-sans">
                      ✕ {clientError}
                      {needsVerification && (
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          className="block mt-2 underline text-red-200 hover:text-white"
                        >
                          {resendSent ? "E-mail renvoyé (si le compte existe)" : "Renvoyer l'e-mail de confirmation"}
                        </button>
                      )}
                    </div>
                  ) : null}

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setClientMode("register"); setClientError(""); }}
                      className="text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                      Pas encore de compte ? Créer un accès client
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold font-heading tracking-wide">
                  Créer votre accès client
                </h2>
                <p className="mt-2 text-zinc-400 text-xs leading-relaxed font-sans">
                  Un e-mail de confirmation vous sera envoyé avant toute connexion.
                </p>

                {regSuccess ? (
                  <div className="mt-6 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-sm font-sans">
                    Compte créé. Vérifiez votre boîte mail ({regEmail}) et cliquez sur le lien de confirmation pour activer votre accès.
                  </div>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      placeholder="Prénom & Nom"
                      className="w-full rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#A855F7] focus:outline-none focus:ring-1 focus:ring-[#A855F7]/30 transition-all font-sans"
                    />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      placeholder="client@domaine.com"
                      className="w-full rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#A855F7] focus:outline-none focus:ring-1 focus:ring-[#A855F7]/30 transition-all font-sans"
                    />
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      placeholder="Mot de passe (8 caractères min.)"
                      className="w-full rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#A855F7] focus:outline-none focus:ring-1 focus:ring-[#A855F7]/30 transition-all font-sans"
                    />
                    {/* Honeypot — masqué visuellement, jamais rempli par un humain */}
                    <input
                      type="text"
                      value={regHoneypot}
                      onChange={(e) => setRegHoneypot(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
                    />

                    <Button
                      type="submit"
                      disabled={regLoading}
                      className="w-full mt-2 bg-transparent hover:bg-transparent border border-white/80 hover:border-[#A855F7]/90 hover:shadow-[0_0_18px_rgba(168,85,247,0.45),0_0_4px_rgba(168,85,247,0.25)] text-white text-xs font-semibold py-3.5 rounded-full transition-all uppercase tracking-wider disabled:opacity-50 font-sans hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {regLoading ? "Création..." : "Créer mon compte"}
                    </Button>

                    {regError ? (
                      <div className="mt-4 p-3 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs font-sans">
                        ✕ {regError}
                      </div>
                    ) : null}

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => { setClientMode("login"); setRegError(""); }}
                        className="text-xs text-zinc-500 hover:text-white transition-colors"
                      >
                        Déjà un compte ? Se connecter
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        ) : (
          /* ── FORM ADMIN (Credentials) ── */
          <div className="animate-fadeIn duration-300">
            <h2 className="text-xl font-bold font-heading tracking-wide">Console équipe</h2>
            <p className="mt-2 text-zinc-400 text-xs leading-relaxed font-sans">
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
                  className="w-full rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#A855F7] focus:outline-none focus:ring-1 focus:ring-[#A855F7]/30 transition-all font-sans"
                />
              </div>

              <div>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  placeholder="Mot de passe"
                  className="w-full rounded-full border border-white/10 bg-white/[0.02] px-5 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#A855F7] focus:outline-none focus:ring-1 focus:ring-[#A855F7]/30 transition-all font-sans"
                />
              </div>

              <Button 
                type="submit" 
                disabled={adminLoading} 
                className="w-full mt-2 bg-white text-black hover:bg-zinc-200 text-xs font-semibold py-3.5 rounded-full transition-all shadow-lg uppercase tracking-wider disabled:opacity-50 font-sans hover:scale-[1.02] active:scale-[0.98]"
              >
                {adminLoading ? "Authentification..." : "Accéder à la console"}
              </Button>

              {adminError ? (
                <div className="mt-4 p-3 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs">
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

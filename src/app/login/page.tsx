"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard"
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060309] text-white">
      {/* Decorative gradient blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#7C3AED]/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="text-[#7C3AED] font-bold text-2xl mb-2">Purity Project OS</div>
          <p className="text-zinc-400 text-sm">Connectez-vous pour accéder à votre espace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#7C3AED] transition-colors"
              placeholder="client@purity.be"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Mot de passe</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#7C3AED] transition-colors"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-2 rounded-lg transition-colors">
            Se connecter
          </Button>
        </form>
      </div>
    </div>
  )
}

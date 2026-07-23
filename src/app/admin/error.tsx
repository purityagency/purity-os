"use client"

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="min-h-[60vh] flex items-center justify-center"><div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center"><h2 className="text-xl font-semibold text-white">Impossible de charger cet espace</h2><p className="mt-2 text-sm text-zinc-400">Une erreur temporaire est survenue. Réessayez.</p><button onClick={() => reset()} className="mt-6 rounded-lg bg-[#7C3AED] px-5 py-2 text-sm font-medium text-white hover:bg-[#6D28D9]">Réessayer</button></div></div>
}

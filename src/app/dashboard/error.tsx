"use client"

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="min-h-[60vh] flex items-center justify-center"><div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center"><h2 className="text-xl font-semibold text-white">Votre espace est momentanément indisponible</h2><p className="mt-2 text-sm text-zinc-400">Vos données sont conservées. Relancez le chargement.</p><button onClick={() => reset()} className="mt-6 rounded-lg bg-[#7C3AED] px-5 py-2 text-sm font-medium text-white hover:bg-[#6D28D9]">Réessayer</button></div></div>
}

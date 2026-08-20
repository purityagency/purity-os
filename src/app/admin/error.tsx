"use client"

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-xl w-full rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-4 shadow-xl">
        <h2 className="text-xl font-semibold text-white">Impossible de charger cet espace</h2>
        <p className="text-sm text-zinc-400">Une erreur temporaire est survenue. Détails ci-dessous pour debug.</p>
        
        <div className="p-4 bg-[#0f1014] rounded-lg border border-red-500/10 text-left overflow-auto max-h-[300px]">
          <p className="text-red-400 font-mono text-[13px] font-semibold mb-2">Message : {error.message || "Aucun message d'erreur."}</p>
          {error.digest && <p className="text-zinc-500 font-mono text-[11px] mt-2">Digest : {error.digest}</p>}
          {error.stack && (
            <pre className="text-zinc-500 font-mono text-[10px] mt-4 whitespace-pre-wrap">
              {error.stack}
            </pre>
          )}
        </div>

        <button 
          onClick={() => reset()} 
          className="mt-4 rounded-lg bg-[#7C3AED] px-5 py-2 text-sm font-medium text-white hover:bg-[#6D28D9] transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}

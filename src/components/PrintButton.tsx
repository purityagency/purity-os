"use client"

export function PrintButton({ label = "Enregistrer en PDF / Imprimer" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print fixed top-4 right-4 z-50 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-zinc-800 transition-colors cursor-pointer"
    >
      {label}
    </button>
  )
}

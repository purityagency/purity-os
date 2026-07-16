"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { Document } from "@prisma/client"
import { Button } from "@/components/ui/button"

const TYPE_LABELS: Record<string, string> = {
  INVOICE: "Facture",
  ASSET: "Livrable",
  CONTRACT: "Contrat",
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function ProjectDocuments({
  projectId,
  documents,
  canUpload = false,
}: {
  projectId: string
  documents: Document[]
  canUpload?: boolean
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [type, setType] = useState("ASSET")
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const formEl = formRef.current
    if (!formEl) return

    const fileInput = formEl.elements.namedItem("file") as HTMLInputElement
    if (!fileInput.files || fileInput.files.length === 0) {
      setError("Choisissez un fichier.")
      return
    }

    const formData = new FormData()
    formData.set("projectId", projectId)
    formData.set("type", type)
    formData.set("file", fileInput.files[0])

    setUploading(true)
    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData })
      if (!res.ok) {
        setError("Échec de l'envoi. Réessayez.")
        return
      }
      formEl.reset()
      router.refresh()
    } catch {
      setError("Connexion impossible. Réessayez.")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce document ?")) return
    await fetch(`/api/documents/${id}`, { method: "DELETE" })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun document pour ce projet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 text-sm">
              <div className="min-w-0">
                <a
                  href={`/api/documents/${doc.id}`}
                  className="font-medium text-white hover:text-[#7C3AED] transition-colors truncate block"
                >
                  {doc.filename}
                </a>
                <div className="text-xs text-zinc-500">
                  {TYPE_LABELS[doc.type] ?? doc.type} · {formatSize(doc.filesize)} · {new Date(doc.uploadedAt).toLocaleDateString('fr-BE')}
                </div>
              </div>
              {canUpload && (
                <Button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="h-7 px-2 text-xs bg-white/5 hover:bg-red-500/20 hover:text-red-300 text-zinc-400 shrink-0 ml-2"
                >
                  Supprimer
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {canUpload && (
        <form ref={formRef} onSubmit={handleUpload} className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white"
          >
            <option value="ASSET">Livrable</option>
            <option value="INVOICE">Facture</option>
            <option value="CONTRACT">Contrat</option>
          </select>
          <input
            type="file"
            name="file"
            required
            className="text-sm text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:px-3 file:py-1.5 file:text-xs flex-1 min-w-[180px]"
          />
          <Button type="submit" disabled={uploading} className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-9">
            {uploading ? "Envoi..." : "Envoyer"}
          </Button>
          {error && <p className="text-xs text-red-400 w-full">{error}</p>}
        </form>
      )}
    </div>
  )
}

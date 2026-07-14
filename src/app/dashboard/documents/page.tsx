import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const project = await prisma.project.findFirst({
    where: { clientId: session.user.id },
    include: { documents: true }
  })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Documents</h1>

      {!project ? (
        <p className="text-zinc-500">Aucun projet actif.</p>
      ) : (
        <div className="p-6 border border-white/10 bg-white/5 rounded-2xl backdrop-blur-sm">
          <h3 className="font-bold mb-4 text-[#7C3AED]">Fichiers de votre projet</h3>

          <div className="space-y-4">
            {project.documents.map((doc) => (
              <div key={doc.id} className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-white/5">
                <div>
                  <div className="font-medium text-white">{doc.filename}</div>
                  <div className="text-xs text-zinc-500">{(doc.filesize / 1024).toFixed(2)} KB • {doc.mimeType}</div>
                </div>
                <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors text-white">
                  Télécharger
                </a>
              </div>
            ))}

            {project.documents.length === 0 && (
              <div className="text-center p-8 border border-dashed border-white/10 rounded-lg">
                <p className="text-zinc-500 text-sm mb-2">Aucun document pour le moment.</p>
                <p className="text-zinc-600 text-xs">Les fichiers partagés par l&apos;équipe Purity apparaîtront ici.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

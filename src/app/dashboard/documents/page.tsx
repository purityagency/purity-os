import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ProjectDocuments } from "@/components/ProjectDocuments"

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const project = await prisma.project.findFirst({
    where: { clientId: session.user.id },
    include: { documents: { orderBy: { uploadedAt: "desc" } } }
  })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Documents</h1>

      {!project ? (
        <p className="text-zinc-500">Aucun projet actif.</p>
      ) : (
        <div className="p-6 border border-white/10 bg-white/5 rounded-2xl backdrop-blur-sm">
          <h3 className="font-bold mb-4 text-[#7C3AED]">Fichiers de votre projet</h3>
          <ProjectDocuments projectId={project.id} documents={project.documents} canUpload={true} />
        </div>
      )}
    </div>
  )
}

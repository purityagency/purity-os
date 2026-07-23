import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ProjectChat } from "@/components/ProjectChat"

export default async function MessagesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const project = await prisma.project.findFirst({
    where: { clientId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, email: true } } }
      }
    }
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          Discussions & Support
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Canal direct sécurisé avec l&apos;équipe technique Purity Agency.</p>
      </div>

      {!project ? (
        <div className="p-8 border border-white/5 bg-[#060309]/50 rounded-2xl text-center">
          <p className="text-zinc-500 text-sm">Aucun projet actif rattaché à ce compte.</p>
        </div>
      ) : (
        <div className="p-6 rounded-2xl glass-panel">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
            <div>
              <h2 className="font-bold text-white text-base">{project.name}</h2>
              <span className="text-xs text-[#7C3AED]">Canal Projet Dédié</span>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-semibold">
              En ligne 24/7
            </span>
          </div>

          <ProjectChat
            messages={project.messages}
            projectId={project.id}
            currentUserId={session.user.id}
          />
        </div>
      )}
    </div>
  )
}

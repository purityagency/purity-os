import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-[#060309] text-white flex">
      {/* Sidebar (Minimal MVP) */}
      <aside className="w-64 border-r border-white/10 bg-[#0a050f] hidden md:block">
        <div className="p-6">
          <div className="text-[#7C3AED] font-bold text-xl">Purity OS</div>
          <div className="mt-8 space-y-4 text-sm text-zinc-400">
            <div className="text-white hover:text-[#7C3AED] cursor-pointer transition-colors">Aperçu</div>
            <div className="hover:text-[#7C3AED] cursor-pointer transition-colors">Timeline</div>
            <div className="hover:text-[#7C3AED] cursor-pointer transition-colors">Fichiers</div>
          </div>
        </div>
        <div className="absolute bottom-0 w-64 p-6 border-t border-white/10 text-sm text-zinc-400">
          Connecté en tant que<br />
          <span className="text-white truncate block">{session.user?.email}</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

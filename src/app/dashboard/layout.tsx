import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { redirect } from "next/navigation"
import { ClientSidebar } from "@/components/ClientSidebar"
import { MobileHeader } from "@/components/MobileHeader"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-[#060309] text-white flex flex-col md:flex-row">
      <MobileHeader session={session} isAdmin={false} />
      <ClientSidebar session={session} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

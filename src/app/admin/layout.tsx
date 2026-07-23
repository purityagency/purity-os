import { getServerSession } from "next-auth/next"
import { authOptions } from "@/modules/auth/authOptions"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/AdminSidebar"
import { MobileHeader } from "@/components/MobileHeader"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect(session ? "/dashboard" : "/login")
  }

  return (
    <div className="min-h-screen bg-[#060309] text-white flex flex-col md:flex-row">
      <MobileHeader session={session} isAdmin={true} />
      <AdminSidebar session={session} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

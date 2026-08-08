import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/session"
import { InboxIcon, MailIcon, ReplyIcon } from "@/components/icons"
import Link from "next/link"

export default async function AcquisitionInboxPage() {
  await requireAdminSession()

  // Fetch leads that have replied or need attention in the inbox context
  // For now, we list any leads that have status "REPLIED" (or mock it if none)
  const repliedLeads = await prisma.lead.findMany({
    where: { status: "REPLIED" },
    include: { emailDrafts: true, mission: true },
    orderBy: { updatedAt: "desc" }
  })

  // Mock UI state if empty to show the design
  const showMockData = repliedLeads.length === 0
  
  const displayLeads = showMockData 
    ? [
        {
          id: "mock-1",
          companyName: "Toiture Moderne SPRL",
          contactName: "Jean Dupont",
          contactEmail: "jean@toituremoderne.be",
          updatedAt: new Date(),
          status: "REPLIED",
          lastMessage: "Bonjour, oui cela pourrait nous intéresser. Pouvons-nous en discuter la semaine prochaine ?",
          missionName: "Campagne BTP Wallonie"
        },
        {
          id: "mock-2",
          companyName: "Hôtel Le repos",
          contactName: "Marie Dubois",
          contactEmail: "direction@hotel-repos.be",
          updatedAt: new Date("2026-08-06T10:00:00Z"),
          status: "REPLIED",
          lastMessage: "Non merci, nous avons déjà un prestataire.",
          missionName: "Campagne HoReCa Namur"
        }
      ]
    : repliedLeads.map(l => ({
        id: l.id,
        companyName: l.companyName,
        contactName: l.contactName || "Contact inconnu",
        contactEmail: l.contactEmail || "Email inconnu",
        updatedAt: l.updatedAt,
        status: l.status,
        lastMessage: l.emailDrafts.length > 0 ? "Réponse reçue (voir CRM pour détails)" : "Nouvelle réponse entrante.",
        missionName: l.mission.name
      }))

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <InboxIcon className="w-5 h-5 text-violet-500" />
              Inbox Acquisition
            </h1>
            <p className="text-xs text-zinc-400">
              Réponses des leads prospectés et suivi des conversations.
            </p>
          </div>
        </div>
        <div className="text-xs font-mono px-3 py-1 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
          {displayLeads.length} conversation(s)
        </div>
      </div>

      {/* Main Split-View Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Email List */}
        <div className="w-1/3 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
          {displayLeads.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
              <p className="text-sm font-semibold text-zinc-300">Aucun message</p>
            </div>
          ) : (
            displayLeads.map((lead, idx) => (
              <div 
                key={lead.id} 
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  idx === 0 
                    ? "bg-violet-600/10 border-violet-500/30 shadow-[0_4px_20px_rgba(139,92,246,0.05)]" 
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`text-sm font-bold truncate ${idx === 0 ? "text-violet-100" : "text-white"}`}>
                    {lead.companyName}
                  </h3>
                  <span className="text-[9px] text-zinc-500 font-mono shrink-0 ml-2 mt-1">
                    {lead.updatedAt.toLocaleDateString("fr-BE", { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 truncate mb-2">{lead.contactName} • {lead.missionName}</p>
                <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                  {lead.lastMessage}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Right: Conversation Detail (Mocked for first item) */}
        <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl flex flex-col overflow-hidden relative backdrop-blur-md">
          {/* Subtle glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
          
          {displayLeads.length > 0 ? (
            <>
              {/* Message Header */}
              <div className="shrink-0 p-5 border-b border-white/5 bg-white/[0.01]">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-white">{displayLeads[0].companyName}</h2>
                    <p className="text-xs text-zinc-400 mt-1">{displayLeads[0].contactName} &lt;{displayLeads[0].contactEmail}&gt;</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2.5 py-1 text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                      REPLIED
                    </span>
                  </div>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 p-5 overflow-y-auto space-y-6 custom-scrollbar">
                {/* Outbound Email (Mock) */}
                <div className="flex flex-col gap-1 items-end pl-12">
                  <span className="text-[10px] text-zinc-500 font-mono mr-1">Hier, 10:30 (Purity AI)</span>
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl rounded-tr-sm p-4 text-sm text-zinc-300 w-full">
                    <p>Bonjour {displayLeads[0].contactName},<br/><br/>J&apos;ai remarqué que votre entreprise n&apos;était pas optimisée pour le SEO local en Wallonie. Nous pouvons vous aider...</p>
                  </div>
                </div>

                {/* Inbound Email (Mock) */}
                <div className="flex flex-col gap-1 items-start pr-12">
                  <span className="text-[10px] text-zinc-500 font-mono ml-1">Aujourd&apos;hui, 09:15 ({displayLeads[0].contactName})</span>
                  <div className="bg-violet-600/10 border border-violet-500/20 rounded-2xl rounded-tl-sm p-4 text-sm text-violet-100 w-full shadow-lg shadow-violet-900/10">
                    <p>{displayLeads[0].lastMessage}</p>
                  </div>
                </div>
              </div>

              {/* Reply Box */}
              <div className="shrink-0 p-4 border-t border-white/5 bg-black/50">
                <div className="relative">
                  <textarea 
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-3 pr-12 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none"
                    rows={3}
                    placeholder="Répondre au lead..."
                  ></textarea>
                  <button className="absolute right-3 bottom-3 p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors cursor-pointer shadow-md shadow-violet-600/20">
                    <ReplyIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Sélectionnez une conversation
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

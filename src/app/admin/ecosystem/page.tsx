"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, Activity, Brain, Server, Terminal, Layers } from "lucide-react"

type AgentActivity = {
  id: string
  agentName: string
  department: string
  status: "IDLE" | "WORKING" | "ERROR"
  currentTask: string | null
  lastLog: string | null
  updatedAt: string
}

export default function EcosystemDashboard() {
  const [agents, setAgents] = useState<AgentActivity[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentActivity | null>(null)
  
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch("/api/agents/status")
        const data = await res.json()
        if (data.agents) {
          setAgents(data.agents)
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchAgents()
    const interval = setInterval(fetchAgents, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-[#060309] text-white p-8 relative overflow-hidden">
      {/* Background Matrix Effect */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7C3AED] rounded-full mix-blend-screen filter blur-[150px] opacity-10 animate-pulse"></div>

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Server className="w-8 h-8 text-[#7C3AED]" />
          Command Center <span className="text-xs px-2 py-1 bg-white/10 rounded-full text-zinc-400 font-mono tracking-widest ml-2 border border-white/5">LIVE</span>
        </h1>
        <p className="text-sm text-zinc-400">Surveillance en temps réel de l'activité du réseau de neurones Purity.</p>
      </header>

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 border border-white/5 rounded-2xl bg-white/[0.01]">
          <Activity className="w-8 h-8 mb-4 opacity-50" />
          <p className="text-sm font-mono uppercase tracking-widest">Le réseau est silencieux</p>
          <p className="text-xs mt-2 opacity-70">Aucun agent enregistré dans la base de données.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard 
              key={agent.agentName} 
              agent={agent} 
              onClick={() => setSelectedAgent(agent)} 
            />
          ))}
        </div>
      )}

      {/* Slide-over Detail Panel */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-[450px] h-full bg-[#0a050f]/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl z-50 p-6 flex flex-col"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">
                  {selectedAgent.department}
                </div>
                <h2 className="text-2xl font-bold">{selectedAgent.agentName}</h2>
              </div>
              <button 
                onClick={() => setSelectedAgent(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-6">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">État actuel</h3>
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    {selectedAgent.status === "WORKING" && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      selectedAgent.status === 'WORKING' ? 'bg-emerald-500' : 
                      selectedAgent.status === 'ERROR' ? 'bg-red-500' : 'bg-zinc-600'
                    }`}></span>
                  </span>
                  <span className="font-mono text-sm">
                    {selectedAgent.status === "WORKING" ? "TRAITEMENT EN COURS" : 
                     selectedAgent.status === "ERROR" ? "ERREUR SYSTÈME" : "EN ATTENTE"}
                  </span>
                </div>
                {selectedAgent.currentTask && (
                  <div className="mt-4 p-3 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-lg text-sm text-[#7C3AED]">
                    {selectedAgent.currentTask}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Terminal Logs
                </h3>
                <div className="h-[300px] overflow-y-auto bg-black border border-white/10 rounded-xl p-4 font-mono text-xs text-zinc-300">
                  <div className="opacity-50 mb-2">Connecté au flux de {selectedAgent.agentName}...</div>
                  {selectedAgent.lastLog ? (
                    <div className="text-emerald-400">{selectedAgent.lastLog}</div>
                  ) : (
                    <div className="text-zinc-600 italic">Aucun log récent.</div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Overlay to close panel */}
      {selectedAgent && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setSelectedAgent(null)}
        />
      )}
    </div>
  )
}

function AgentCard({ agent, onClick }: { agent: AgentActivity, onClick: () => void }) {
  const isWorking = agent.status === "WORKING"
  const isBrand = agent.department === "02_BRAND"
  
  const glowColor = isBrand ? "rgba(124, 58, 237, 0.5)" : "rgba(16, 185, 129, 0.5)" // Purple for brand, Emerald for acq

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative cursor-pointer overflow-hidden rounded-2xl border bg-white/[0.02] backdrop-blur-xl transition-all duration-500 p-6 flex flex-col h-48
        ${isWorking ? 'border-white/20' : 'border-white/5 hover:border-white/10'}
      `}
      style={{
        boxShadow: isWorking ? `0 0 40px -10px ${glowColor}` : 'none'
      }}
    >
      {/* Background pulsing gradient when working */}
      {isWorking && (
        <motion.div 
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at top right, ${isBrand ? '#7C3AED' : '#10B981'}, transparent 60%)`
          }}
        />
      )}

      <div className="relative z-10 flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isWorking ? 'bg-white/10' : 'bg-white/5'}`}>
            {isBrand ? <Brain className="w-5 h-5 text-[#7C3AED]" /> : <Layers className="w-5 h-5 text-emerald-400" />}
          </div>
          <div>
            <h3 className="font-bold text-lg text-white/90 leading-tight">{agent.agentName}</h3>
            <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">{agent.department}</span>
          </div>
        </div>
        
        <div className="flex h-3 w-3 relative">
          {isWorking && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBrand ? 'bg-[#7C3AED]' : 'bg-emerald-400'}`}></span>
          )}
          <span className={`relative inline-flex rounded-full h-3 w-3 ${
            isWorking ? (isBrand ? 'bg-[#7C3AED]' : 'bg-emerald-500') : 
            agent.status === 'ERROR' ? 'bg-red-500' : 'bg-zinc-700'
          }`}></span>
        </div>
      </div>

      <div className="mt-auto relative z-10">
        {isWorking ? (
          <div className="text-sm text-zinc-300 font-medium truncate flex items-center gap-2">
            <Activity className="w-4 h-4 animate-pulse" />
            {agent.currentTask || "En traitement..."}
          </div>
        ) : (
          <div className="text-xs text-zinc-600 font-mono italic">
            En veille. Prêt pour la prochaine mission.
          </div>
        )}
      </div>
    </motion.div>
  )
}

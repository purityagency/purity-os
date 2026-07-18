"use client"

import { useRef, useEffect, useOptimistic, startTransition } from "react"
import type { Message, User } from "@prisma/client"
import { sendMessage } from "@/actions/messageActions"

type ChatMessage = Message & {
  author: Pick<User, "id" | "name" | "email">
}

export function ProjectChat({ 
  messages, 
  projectId, 
  currentUserId 
}: { 
  messages: ChatMessage[]
  projectId: string
  currentUserId: string 
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use optimistic UI for instant messaging rendering
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage: ChatMessage) => [...state, newMessage]
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [optimisticMessages])

  const handleSubmit = async (formData: FormData) => {
    const content = formData.get("content")?.toString().trim()
    if (!content) return

    formRef.current?.reset()

    const tempId = Math.random().toString()
    const optimisticMsg: ChatMessage = {
      id: tempId,
      projectId,
      stageId: null,
      authorId: currentUserId,
      content,
      createdAt: new Date(),
      author: {
        id: currentUserId,
        name: "Vous",
        email: ""
      }
    }

    startTransition(() => {
      addOptimisticMessage(optimisticMsg)
    })

    try {
      await sendMessage(projectId, formData)
    } catch (err) {
      console.error("Error sending message:", err)
    }
  }

  return (
    <div className="flex flex-col h-[500px] w-full min-w-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 custom-scrollbar">
        {optimisticMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <svg className="w-8 h-8 text-zinc-600 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs text-zinc-500">Aucun message pour le moment. Démarrez la conversation !</p>
          </div>
        )}
        
        {optimisticMessages.map((msg) => {
          const isMine = msg.authorId === currentUserId
          const timeString = new Date(msg.createdAt).toLocaleTimeString("fr-FR", { 
            hour: "2-digit", 
            minute: "2-digit" 
          })

          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"} space-y-1`}>
              <span className="text-[10px] text-zinc-500 font-semibold tracking-wide px-1">
                {isMine ? "Vous" : msg.author.name}
              </span>
              
              <div className={`group relative max-w-[85%] px-4 py-2.5 shadow-sm text-sm leading-relaxed transition-all duration-200 ${
                isMine 
                  ? "bg-[#7C3AED] text-white rounded-2xl rounded-tr-none" 
                  : "bg-white/[0.03] border border-white/5 text-zinc-100 rounded-2xl rounded-tl-none"
              }`}>
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <span className={`text-[9px] block text-right mt-1.5 opacity-60 font-medium ${isMine ? "text-purple-200" : "text-zinc-500"}`}>
                  {timeString}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form 
        ref={formRef} 
        action={handleSubmit}
        className="flex gap-2 p-1.5 bg-white/[0.02] border border-white/5 rounded-2xl focus-within:border-purple-500/30 focus-within:bg-white/[0.03] transition-all duration-300"
      >
        <input 
          name="content" 
          placeholder="Écrivez un message..." 
          className="flex-1 bg-transparent border-none text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-0 px-3 py-2"
          autoComplete="off"
        />
        <button 
          type="submit" 
          className="p-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-purple-500/20 active:scale-95 transition-all duration-200 flex items-center justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="22" x2="11" y1="2" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  )
}

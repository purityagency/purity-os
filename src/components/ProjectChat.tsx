"use client"

import { useRef, useEffect } from "react"
import { sendMessage } from "@/actions/messageActions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function ProjectChat({ messages, projectId, currentUserId }: { messages: any[], projectId: string, currentUserId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const action = sendMessage.bind(null, projectId)

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-t-xl bg-black/20 border border-white/5">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500 text-center">Aucun message pour le moment. Démarrez la conversation !</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.authorId === currentUserId
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <div className="text-xs text-zinc-500 mb-1">{msg.author.name}</div>
              <div className={`px-4 py-2 rounded-lg max-w-[80%] ${isMine ? 'bg-[#7C3AED] text-white' : 'bg-white/10 text-white'}`}>
                {msg.content}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <form 
        ref={formRef} 
        action={async (formData) => {
          await action(formData)
          formRef.current?.reset()
        }} 
        className="flex gap-2 p-2 bg-black/40 border border-t-0 border-white/5 rounded-b-xl"
      >
        <Input 
          name="content" 
          placeholder="Écrivez un message..." 
          className="flex-1 bg-white/5 border-transparent focus:border-[#7C3AED]"
          autoComplete="off"
        />
        <Button type="submit" className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white">Envoyer</Button>
      </form>
    </div>
  )
}

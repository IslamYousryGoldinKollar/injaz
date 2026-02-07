"use client"

import { useAuth } from "@/contexts/auth-context"
import { useUser } from "@/contexts/user-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { VoiceRecorder } from "@/components/ui/voice-recorder"
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function AiChatPage() {
  const { authUser } = useAuth()
  const { currentUser } = useUser()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!authUser) router.push("/login")
  }, [authUser, router])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || !currentUser) return
    const userMsg: Message = { role: "user", content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          userId: currentUser.id,
          orgId: currentUser.organizationId,
        }),
      })
      const data = await res.json()
      if (data.content) {
        setMessages([...newMessages, { role: "assistant", content: data.content }])
      } else if (data.error) {
        setMessages([...newMessages, { role: "assistant", content: `Error: ${data.error}${data.details ? ` — ${data.details}` : ""}` }])
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I couldn't process that request. Please try again." }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleVoiceRecorded = async (blob: Blob) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("audio", blob)
      const res = await fetch("/api/ai/transcribe", { method: "POST", body: formData })
      const data = await res.json()
      if (data.text) {
        await sendMessage(data.text)
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to transcribe audio. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  if (!authUser || !currentUser) return null

  const suggestions = [
    "Show me the financial summary",
    "Create a payment to Ahmed for 5000 EGP",
    "List all active projects",
    "Add a task: Review contract by Friday",
    "Who are our top clients?",
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold">Hi {currentUser.name.split(" ")[0]}, how can I help?</h1>
            <p className="mb-8 text-center text-muted-foreground">
              Ask me anything — manage payments, tasks, projects, or look up data.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border px-4 py-2 text-sm transition-colors hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 p-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" && "justify-end")}>
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-2xl bg-muted px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t bg-background p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <VoiceRecorder onRecorded={handleVoiceRecorded} disabled={loading} />
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Injaz AI anything..."
              rows={1}
              className="w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
            <Button
              size="icon"
              className="absolute bottom-1.5 right-1.5 h-8 w-8 rounded-lg"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

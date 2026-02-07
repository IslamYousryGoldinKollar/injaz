"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSystemSettings, saveSystemSettings } from "@/lib/actions/ai-actions"
import { getCategories, createCategory, deleteCategory } from "@/lib/actions/financial-actions"
import { Save, Trash2, Plus, Bot, Tag, Webhook } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function SettingsPage() {
  const { currentUser } = useUser()
  const orgId = currentUser?.organizationId
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiContext, setAiContext] = useState("")
  const [categories, setCategories] = useState<any[]>([])
  const [newCat, setNewCat] = useState({ name: "", type: "OUTBOUND" })
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    if (!orgId) return
    const [settings, cats] = await Promise.all([
      getSystemSettings("ai_settings"),
      getCategories(orgId),
    ])
    if (settings) {
      const s = settings as any
      setAiPrompt(s.systemPrompt || "")
      setAiContext(s.companyContext || "")
    }
    setCategories(cats)
  }, [orgId])
  useEffect(() => { void load() }, [load])

  const saveAiSettings = async () => {
    await saveSystemSettings("ai_settings", { systemPrompt: aiPrompt, companyContext: aiContext })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addCategory = async () => {
    if (!orgId || !newCat.name) return
    await createCategory({ organizationId: orgId, name: newCat.name, type: newCat.type as any })
    setNewCat({ name: "", type: "OUTBOUND" })
    load()
  }

  const removeCategory = async (id: string) => {
    await deleteCategory(id)
    load()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> AI Assistant</CardTitle>
          <CardDescription>Configure how the AI assistant behaves and what it knows about your business.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Custom Instructions</label>
            <textarea
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={4}
              placeholder="Add custom instructions for the AI... e.g. 'Always use EGP currency. Our fiscal year starts in July.'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Company Context</label>
            <textarea
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={4}
              placeholder="Describe your business... e.g. 'We are a construction company based in Cairo. We work with subcontractors and have 12 employees.'"
              value={aiContext}
              onChange={(e) => setAiContext(e.target.value)}
            />
          </div>
          <Button onClick={saveAiSettings} className="w-full">
            <Save className="h-4 w-4" /> {saved ? "Saved!" : "Save AI Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> Payment Categories</CardTitle>
          <CardDescription>Organize your payments with categories.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Category name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} className="flex-1" />
            <Button variant={newCat.type === "OUTBOUND" ? "default" : "outline"} size="sm" onClick={() => setNewCat({ ...newCat, type: "OUTBOUND" })}>Expense</Button>
            <Button variant={newCat.type === "INBOUND" ? "default" : "outline"} size="sm" onClick={() => setNewCat({ ...newCat, type: "INBOUND" })}>Revenue</Button>
            <Button onClick={addCategory} disabled={!newCat.name}><Plus className="h-4 w-4" /></Button>
          </div>
          {categories.length > 0 && (
            <div className="divide-y rounded-lg border">
              {categories.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${c.type === "INBOUND" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {c.type === "INBOUND" ? "Revenue" : "Expense"}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCategory(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" /> Integrations</CardTitle>
          <CardDescription>Manage external service connections.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Telegram Bot</p>
              <p className="text-xs text-muted-foreground">Receive voice notes and send notifications</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Connected</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Google Gemini AI</p>
              <p className="text-xs text-muted-foreground">AI reasoning and voice transcription</p>
            </div>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Connected" : "API Key Needed"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">Google Sheets</p>
              <p className="text-xs text-muted-foreground">Quotation generation and PDF export</p>
            </div>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">Coming Soon</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

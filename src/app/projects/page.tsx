"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/badge"
import { Combobox } from "@/components/ui/combobox"
import { SlideOver } from "@/components/ui/slide-over"
import { getProjects, createProject, updateProject, deleteProject } from "@/lib/actions/project-actions"
import { getParties } from "@/lib/actions/party-actions"
import { Plus, FolderKanban, Trash2, ListTodo, Banknote } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ProjectsPage() {
  const { currentUser } = useUser()
  const [projects, setProjects] = useState<any[]>([])
  const [parties, setParties] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", clientPartyId: "", description: "", color: "#3b82f6" })

  const orgId = currentUser?.organizationId
  const load = useCallback(async () => {
    if (!orgId) return
    const [p, pts] = await Promise.all([getProjects(orgId), getParties(orgId, "CLIENT" as any)])
    setProjects(p); setParties(pts)
  }, [orgId])
  useEffect(() => { void load() }, [load])

  const handleCreate = async () => {
    if (!orgId || !form.name) return
    await createProject({ organizationId: orgId, name: form.name, clientPartyId: form.clientPartyId || undefined, description: form.description || undefined, color: form.color })
    setShowCreate(false)
    setForm({ name: "", clientPartyId: "", description: "", color: "#3b82f6" })
    load()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await updateProject(id, { status: status as any })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project and all its data?")) return
    await deleteProject(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Project</Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No projects yet. Create your first project to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p: any) => (
            <Card key={p.id} className="overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: p.color || "#3b82f6" }} />
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{p.name}</h3>
                  <StatusBadge status={p.status} />
                </div>
                {p.clientParty && <p className="mb-2 text-xs text-muted-foreground">Client: {p.clientParty.name}</p>}
                {p.description && <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><ListTodo className="h-3 w-3" />{p._count?.tasks || 0} tasks</span>
                  <span className="flex items-center gap-1"><Banknote className="h-3 w-3" />{p._count?.payments || 0} payments</span>
                </div>
                <div className="mt-3 flex gap-1">
                  {["ACTIVE", "ON_HOLD", "COMPLETED"].map((s) => (
                    <Button key={s} variant={p.status === s ? "default" : "ghost"} size="sm" className="h-7 text-xs flex-1" onClick={() => handleStatusChange(p.id, s)}>
                      {s === "ON_HOLD" ? "Hold" : s.charAt(0) + s.slice(1).toLowerCase()}
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <div className="space-y-4">
          <Input placeholder="Project name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Combobox
            options={parties.map((p: any) => ({ value: p.id, label: p.name }))}
            value={form.clientPartyId}
            onValueChange={(v) => setForm({ ...form, clientPartyId: v })}
            placeholder="Client (optional)"
            searchPlaceholder="Search clients..."
          />
          <textarea className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div>
            <label className="mb-1 block text-sm font-medium">Color</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border" />
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={!form.name}>Create Project</Button>
        </div>
      </SlideOver>
    </div>
  )
}

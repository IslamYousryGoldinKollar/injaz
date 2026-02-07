"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge, StatusBadge } from "@/components/ui/badge"
import { Combobox } from "@/components/ui/combobox"
import { SlideOver } from "@/components/ui/slide-over"
import { getProjects, getProjectById, createProject, updateProject, deleteProject } from "@/lib/actions/project-actions"
import { updateTask } from "@/lib/actions/task-actions"
import { getParties } from "@/lib/actions/party-actions"
import { formatCurrency, cn } from "@/lib/utils"
import { GanttChart } from "@/components/views/gantt-chart"
import { CalendarView } from "@/components/views/calendar-view"
import { BoardView } from "@/components/views/board-view"
import { Plus, FolderKanban, Trash2, ListTodo, Banknote, Receipt, List, LayoutGrid, Calendar, GanttChartSquare, Pencil, Save, ChevronRight } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
type TaskView = "list" | "board" | "calendar" | "gantt"
const taskViews: { value: TaskView; label: string; icon: any }[] = [
  { value: "list", label: "List", icon: List },
  { value: "board", label: "Board", icon: LayoutGrid },
  { value: "calendar", label: "Cal", icon: Calendar },
  { value: "gantt", label: "Gantt", icon: GanttChartSquare },
]

export default function ProjectsPage() {
  const { currentUser } = useUser()
  const [projects, setProjects] = useState<any[]>([])
  const [parties, setParties] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [taskView, setTaskView] = useState<TaskView>("list")
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", description: "", color: "#3b82f6" })
  const [form, setForm] = useState({ name: "", clientPartyId: "", description: "", color: "#3b82f6", budget: "" })
  const [statusFilter, setStatusFilter] = useState("")

  const orgId = currentUser?.organizationId
  const load = useCallback(async () => {
    if (!orgId) return
    const [p, pts] = await Promise.all([
      getProjects(orgId, statusFilter ? statusFilter as any : undefined),
      getParties(orgId, "CLIENT" as any),
    ])
    setProjects(p); setParties(pts)
  }, [orgId, statusFilter])
  useEffect(() => { void load() }, [load])

  const handleCreate = async () => {
    if (!orgId || !form.name) return
    await createProject({
      organizationId: orgId, name: form.name,
      clientPartyId: form.clientPartyId || undefined,
      description: form.description || undefined,
      color: form.color,
      budget: form.budget ? parseFloat(form.budget) : undefined,
    })
    setShowCreate(false)
    setForm({ name: "", clientPartyId: "", description: "", color: "#3b82f6", budget: "" })
    load()
  }

  const handleSelect = async (id: string) => {
    const p = await getProjectById(id)
    setSelected(p)
    setEditing(false)
    setTaskView("list")
    if (p) setEditForm({ name: p.name, description: p.description || "", color: p.color || "#3b82f6" })
  }

  const handleSave = async () => {
    if (!selected) return
    await updateProject(selected.id, { name: editForm.name, description: editForm.description || undefined, color: editForm.color })
    const updated = await getProjectById(selected.id)
    setSelected(updated)
    setEditing(false)
    load()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await updateProject(id, { status: status as any })
    if (selected?.id === id) {
      const updated = await getProjectById(id)
      setSelected(updated)
    }
    load()
  }

  const handleTaskStatusChange = async (taskId: string, status: string) => {
    await updateTask(taskId, { status })
    if (selected) {
      const updated = await getProjectById(selected.id)
      setSelected(updated)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project and all its data?")) return
    await deleteProject(id)
    setSelected(null)
    load()
  }

  // Transform project tasks for view components
  const projectTasks = (selected?.tasks || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    projectName: selected?.name,
    projectColor: selected?.color,
    assigneeName: t.assignee?.name,
    dueDate: t.dueDate ? new Date(t.dueDate) : null,
    startDate: t.startDate ? new Date(t.startDate) : null,
    endDate: t.endDate ? new Date(t.endDate) : null,
    isMilestone: t.isMilestone || false,
  }))

  const stats = {
    total: projects.length,
    active: projects.filter((p: any) => p.status === "ACTIVE").length,
    completed: projects.filter((p: any) => p.status === "COMPLETED").length,
    onHold: projects.filter((p: any) => p.status === "ON_HOLD").length,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Project</Button>
      </div>

      {/* Stats + filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={!statusFilter ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setStatusFilter("")}>
          All ({stats.total})
        </Button>
        <Button variant={statusFilter === "ACTIVE" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setStatusFilter("ACTIVE")}>
          Active ({stats.active})
        </Button>
        <Button variant={statusFilter === "ON_HOLD" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setStatusFilter("ON_HOLD")}>
          On Hold ({stats.onHold})
        </Button>
        <Button variant={statusFilter === "COMPLETED" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setStatusFilter("COMPLETED")}>
          Completed ({stats.completed})
        </Button>
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
            <Card key={p.id} className="overflow-hidden cursor-pointer transition-shadow hover:shadow-md" onClick={() => handleSelect(p.id)}>
              <div className="h-1.5" style={{ backgroundColor: p.color || "#3b82f6" }} />
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">{p.name}</h3>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={p.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                {p.clientParty && <p className="mb-2 text-xs text-muted-foreground">Client: {p.clientParty.name}</p>}
                {p.description && <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><ListTodo className="h-3 w-3" />{p._count?.tasks || 0} tasks</span>
                  <span className="flex items-center gap-1"><Banknote className="h-3 w-3" />{p._count?.payments || 0} payments</span>
                  <span className="flex items-center gap-1"><Receipt className="h-3 w-3" />{p._count?.documents || 0} docs</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <div className="space-y-4">
          <Input placeholder="Project name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Combobox options={parties.map((p: any) => ({ value: p.id, label: p.name }))} value={form.clientPartyId} onValueChange={(v) => setForm({ ...form, clientPartyId: v })} placeholder="Client (optional)" searchPlaceholder="Search clients..." />
          <textarea className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input type="number" placeholder="Budget (optional)" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Color</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border" />
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={!form.name}>Create Project</Button>
        </div>
      </SlideOver>

      {/* Project Detail */}
      <SlideOver open={!!selected} onClose={() => { setSelected(null); setEditing(false) }} title={selected?.name} wide>
        {selected && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded" style={{ backgroundColor: selected.color || "#3b82f6" }} />
                <StatusBadge status={selected.status} />
                {selected.clientParty && <Badge variant="secondary" className="text-xs">{selected.clientParty.name}</Badge>}
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(!editing)}>
                  {editing ? "Cancel" : <><Pencil className="h-3 w-3" /> Edit</>}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => handleDelete(selected.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name" />
                <textarea className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm" rows={2} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                <input type="color" value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} className="h-8 w-full rounded border" />
                <Button className="w-full" onClick={handleSave}><Save className="h-4 w-4" /> Save</Button>
              </div>
            ) : (
              <>
                {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}
                {selected.budget && (
                  <div className="rounded-lg bg-secondary/50 p-3">
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="text-lg font-bold">{formatCurrency(Number(selected.budget))}</p>
                  </div>
                )}
              </>
            )}

            {/* Status buttons */}
            <div className="flex gap-1">
              {["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"].map((s) => (
                <Button key={s} variant={selected.status === s ? "default" : "outline"} size="sm" className="h-7 text-xs flex-1" onClick={() => handleStatusChange(selected.id, s)}>
                  {s === "ON_HOLD" ? "Hold" : s.charAt(0) + s.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>

            {/* Tasks section with views */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Tasks ({selected.tasks?.length || 0})</h3>
                <div className="flex rounded-md border bg-muted/40 p-0.5">
                  {taskViews.map((v) => (
                    <button
                      key={v.value}
                      className={cn(
                        "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors",
                        taskView === v.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setTaskView(v.value)}
                    >
                      <v.icon className="h-3 w-3" />
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {!selected.tasks?.length ? (
                <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  No tasks yet. Add tasks from the Tasks page.
                </div>
              ) : taskView === "list" ? (
                <div className="divide-y rounded-lg border">
                  {selected.tasks.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", t.status === "Done" ? "bg-emerald-500" : t.status === "In Progress" ? "bg-blue-500" : t.status === "Blocked" ? "bg-rose-500" : "bg-slate-400")} />
                        <span className={cn(t.status === "Done" && "line-through text-muted-foreground")}>{t.title}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{t.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : taskView === "board" ? (
                <BoardView tasks={projectTasks} onStatusChange={handleTaskStatusChange} />
              ) : taskView === "calendar" ? (
                <CalendarView tasks={projectTasks} />
              ) : taskView === "gantt" ? (
                <GanttChart tasks={projectTasks} />
              ) : null}
            </div>

            {/* Payments */}
            {selected.payments?.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Payments ({selected.payments.length})</h3>
                <div className="divide-y rounded-lg border">
                  {selected.payments.slice(0, 10).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <span>{p.party?.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{p.description || p.number}</span>
                      </div>
                      <span className={cn("font-medium", p.direction === "INBOUND" ? "text-emerald-600" : "text-rose-600")}>
                        {p.direction === "INBOUND" ? "+" : "-"}{formatCurrency(Number(p.expectedAmount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {selected.documents?.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Documents ({selected.documents.length})</h3>
                <div className="divide-y rounded-lg border">
                  {selected.documents.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{d.number} ({d.type})</span>
                      <StatusBadge status={d.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Combobox } from "@/components/ui/combobox"
import { SlideOver } from "@/components/ui/slide-over"
import { getTasks, createTask, updateTask, deleteTask } from "@/lib/actions/task-actions"
import { getProjects } from "@/lib/actions/project-actions"
import { getAllUsers } from "@/lib/actions/user-actions"
import { Plus, ListTodo, Trash2, Circle, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/* eslint-disable @typescript-eslint/no-explicit-any */
const statusConfig: Record<string, { icon: any; color: string }> = {
  Planned: { icon: Circle, color: "text-muted-foreground" },
  "In Progress": { icon: Clock, color: "text-blue-600" },
  Done: { icon: CheckCircle2, color: "text-emerald-600" },
  Blocked: { icon: AlertCircle, color: "text-rose-600" },
}
const statuses = ["Planned", "In Progress", "Done", "Blocked"]
const priorities = ["Low", "Medium", "High", "Urgent"]

export default function TasksPage() {
  const { currentUser } = useUser()
  const [tasks, setTasks] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", projectId: "", assigneeId: "", priority: "Medium", dueDate: "" })

  const orgId = currentUser?.organizationId
  const load = useCallback(async () => {
    if (!orgId) return
    const [t, p, u] = await Promise.all([
      getTasks(statusFilter ? { status: statusFilter } : undefined),
      getProjects(orgId),
      getAllUsers(),
    ])
    setTasks(t); setProjects(p); setUsers(u)
  }, [orgId, statusFilter])
  useEffect(() => { void load() }, [load])

  const handleCreate = async () => {
    if (!form.title || !currentUser) return
    await createTask({
      title: form.title, description: form.description || undefined,
      projectId: form.projectId || undefined, assigneeId: form.assigneeId || undefined,
      priority: form.priority, createdById: currentUser.id,
      dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
    })
    setShowCreate(false)
    setForm({ title: "", description: "", projectId: "", assigneeId: "", priority: "Medium", dueDate: "" })
    load()
  }

  const cycleStatus = async (task: any) => {
    const idx = statuses.indexOf(task.status)
    const next = statuses[(idx + 1) % statuses.length]
    await updateTask(task.id, { status: next })
    load()
  }

  const handleDelete = async (id: string) => {
    await deleteTask(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Task</Button>
      </div>

      <div className="flex gap-1">
        <Button variant={!statusFilter ? "default" : "ghost"} size="sm" onClick={() => setStatusFilter("")}>All ({tasks.length})</Button>
        {statuses.map((s) => {
          const count = tasks.filter((t: any) => t.status === s).length
          return <Button key={s} variant={statusFilter === s ? "default" : "ghost"} size="sm" onClick={() => setStatusFilter(s)}>{s} ({count})</Button>
        })}
      </div>

      {tasks.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <ListTodo className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No tasks yet. Create one or ask AI.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((t: any) => {
            const cfg = statusConfig[t.status] || statusConfig.Planned
            const Icon = cfg.icon
            return (
              <Card key={t.id} className="group">
                <CardContent className="flex items-center gap-3 p-3">
                  <button onClick={() => cycleStatus(t)} className="shrink-0">
                    <Icon className={cn("h-5 w-5", cfg.color)} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium", t.status === "Done" && "line-through text-muted-foreground")}>{t.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {t.project && <span style={{ color: t.project.color }}>{t.project.name}</span>}
                      {t.assignee && <span>→ {t.assignee.name}</span>}
                      {t.dueDate && <span>Due {new Date(t.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  {t.priority && (
                    <Badge variant={t.priority === "Urgent" ? "destructive" : t.priority === "High" ? "warning" : "secondary"} className="text-xs">
                      {t.priority}
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="New Task">
        <div className="space-y-4">
          <Input placeholder="Task title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Combobox options={projects.map((p: any) => ({ value: p.id, label: p.name }))} value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })} placeholder="Project (optional)" />
          <Combobox options={users.map((u: any) => ({ value: u.id, label: u.name }))} value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })} placeholder="Assign to..." />
          <div className="flex gap-2">
            {priorities.map((p) => (
              <Button key={p} variant={form.priority === p ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setForm({ ...form, priority: p })}>{p}</Button>
            ))}
          </div>
          <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <Button className="w-full" onClick={handleCreate} disabled={!form.title}>Create Task</Button>
        </div>
      </SlideOver>
    </div>
  )
}

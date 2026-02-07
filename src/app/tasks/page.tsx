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
import { GanttChart } from "@/components/views/gantt-chart"
import { CalendarView } from "@/components/views/calendar-view"
import { BoardView } from "@/components/views/board-view"
import { Plus, ListTodo, Trash2, Circle, CheckCircle2, Clock, AlertCircle, List, LayoutGrid, Calendar, GanttChartSquare, Search, Filter } from "lucide-react"
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

type ViewMode = "list" | "board" | "calendar" | "gantt"
const views: { value: ViewMode; label: string; icon: any }[] = [
  { value: "list", label: "List", icon: List },
  { value: "board", label: "Board", icon: LayoutGrid },
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "gantt", label: "Gantt", icon: GanttChartSquare },
]

export default function TasksPage() {
  const { currentUser } = useUser()
  const [tasks, setTasks] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [statusFilter, setStatusFilter] = useState("")
  const [projectFilter, setProjectFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({ title: "", description: "", projectId: "", assigneeId: "", priority: "Medium", dueDate: "", startDate: "", endDate: "" })

  const orgId = currentUser?.organizationId
  const load = useCallback(async () => {
    if (!orgId) return
    const [t, p, u] = await Promise.all([
      getTasks({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(projectFilter ? { projectId: projectFilter } : {}),
      }),
      getProjects(orgId),
      getAllUsers(),
    ])
    setTasks(t); setProjects(p); setUsers(u)
  }, [orgId, statusFilter, projectFilter])
  useEffect(() => { void load() }, [load])

  const handleCreate = async () => {
    if (!form.title || !currentUser) return
    await createTask({
      title: form.title, description: form.description || undefined,
      projectId: form.projectId || undefined, assigneeId: form.assigneeId || undefined,
      priority: form.priority, createdById: currentUser.id,
      dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
      startDate: form.startDate ? new Date(form.startDate) : undefined,
      endDate: form.endDate ? new Date(form.endDate) : undefined,
    })
    setShowCreate(false)
    setForm({ title: "", description: "", projectId: "", assigneeId: "", priority: "Medium", dueDate: "", startDate: "", endDate: "" })
    load()
  }

  const cycleStatus = async (task: any) => {
    const idx = statuses.indexOf(task.status)
    const next = statuses[(idx + 1) % statuses.length]
    await updateTask(task.id, { status: next })
    load()
  }

  const handleStatusChange = async (taskId: string, status: string) => {
    await updateTask(taskId, { status })
    load()
  }

  const handleDelete = async (id: string) => {
    await deleteTask(id)
    setSelected(null)
    load()
  }

  const handleTaskClick = (taskId: string) => {
    const task = tasks.find((t: any) => t.id === taskId)
    if (task) setSelected(task)
  }

  const filtered = tasks.filter((t: any) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return t.title?.toLowerCase().includes(q) || t.project?.name?.toLowerCase().includes(q) || t.assignee?.name?.toLowerCase().includes(q)
  })

  // Transform tasks for view components
  const viewTasks = filtered.map((t: any) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    projectName: t.project?.name,
    projectColor: t.project?.color,
    assigneeName: t.assignee?.name,
    dueDate: t.dueDate ? new Date(t.dueDate) : null,
    startDate: t.startDate ? new Date(t.startDate) : null,
    endDate: t.endDate ? new Date(t.endDate) : null,
    isMilestone: false,
  }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Task</Button>
      </div>

      {/* View switcher + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View tabs */}
        <div className="flex rounded-lg border bg-muted/40 p-0.5">
          {views.map((v) => (
            <button
              key={v.value}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === v.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setViewMode(v.value)}
            >
              <v.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-xs" />
        </div>

        {/* Project filter */}
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="h-8 rounded-md border bg-transparent px-2 text-xs"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status filter pills */}
      {viewMode === "list" && (
        <div className="flex gap-1 flex-wrap">
          <Button variant={!statusFilter ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setStatusFilter("")}>
            All ({tasks.length})
          </Button>
          {statuses.map((s) => {
            const count = tasks.filter((t: any) => t.status === s).length
            return (
              <Button key={s} variant={statusFilter === s ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setStatusFilter(s)}>
                {s} ({count})
              </Button>
            )
          })}
        </div>
      )}

      {/* Views */}
      {filtered.length === 0 && viewMode === "list" ? (
        <Card><CardContent className="py-12 text-center">
          <ListTodo className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No tasks found. Create one or ask AI.</p>
        </CardContent></Card>
      ) : viewMode === "list" ? (
        <div className="space-y-1.5">
          {filtered.map((t: any) => {
            const cfg = statusConfig[t.status] || statusConfig.Planned
            const Icon = cfg.icon
            return (
              <Card key={t.id} className="group">
                <CardContent className="flex items-center gap-3 p-3">
                  <button onClick={() => cycleStatus(t)} className="shrink-0" title="Click to change status">
                    <Icon className={cn("h-5 w-5", cfg.color)} />
                  </button>
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setSelected(t)}>
                    <p className={cn("font-medium", t.status === "Done" && "line-through text-muted-foreground")}>{t.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {t.project && <span style={{ color: t.project.color }}>{t.project.name}</span>}
                      {t.assignee && <span>→ {t.assignee.name}</span>}
                      {t.dueDate && <span>Due {new Date(t.dueDate).toLocaleDateString()}</span>}
                      {t.startDate && t.endDate && <span>{new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()}</span>}
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
      ) : viewMode === "board" ? (
        <BoardView
          tasks={viewTasks}
          onTaskClick={handleTaskClick}
          onStatusChange={handleStatusChange}
        />
      ) : viewMode === "calendar" ? (
        <CalendarView
          tasks={viewTasks}
          onTaskClick={handleTaskClick}
        />
      ) : viewMode === "gantt" ? (
        <GanttChart
          tasks={viewTasks}
          onTaskClick={handleTaskClick}
        />
      ) : null}

      {/* Create Task */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="New Task">
        <div className="space-y-4">
          <Input placeholder="Task title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Combobox options={projects.map((p: any) => ({ value: p.id, label: p.name }))} value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })} placeholder="Project (optional)" />
          <Combobox options={users.map((u: any) => ({ value: u.id, label: u.name }))} value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })} placeholder="Assign to..." />
          <div className="flex gap-2">
            {priorities.map((p) => (
              <Button key={p} variant={form.priority === p ? "default" : "outline"} size="sm" className="flex-1 text-xs" onClick={() => setForm({ ...form, priority: p })}>{p}</Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Start Date</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">End Date</label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Due Date</label>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={!form.title}>Create Task</Button>
        </div>
      </SlideOver>

      {/* Task Detail */}
      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={selected?.title} wide>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selected.project && (
                  <Badge className="text-xs" style={{ backgroundColor: selected.project.color, color: "#fff" }}>
                    {selected.project.name}
                  </Badge>
                )}
                {selected.priority && (
                  <Badge variant={selected.priority === "Urgent" ? "destructive" : selected.priority === "High" ? "warning" : "secondary"} className="text-xs">
                    {selected.priority}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(selected.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {selected.description && <p className="text-sm text-muted-foreground">{selected.description}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Assignee</p><p className="text-sm">{selected.assignee?.name || "Unassigned"}</p></div>
              <div><p className="text-xs text-muted-foreground">Due Date</p><p className="text-sm">{selected.dueDate ? new Date(selected.dueDate).toLocaleDateString() : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Start</p><p className="text-sm">{selected.startDate ? new Date(selected.startDate).toLocaleDateString() : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">End</p><p className="text-sm">{selected.endDate ? new Date(selected.endDate).toLocaleDateString() : "—"}</p></div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Status</h3>
              <div className="flex flex-wrap gap-1">
                {statuses.map((s) => (
                  <Button key={s} variant={selected.status === s ? "default" : "outline"} size="sm" className="text-xs" onClick={() => { handleStatusChange(selected.id, s); setSelected({ ...selected, status: s }) }}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  )
}

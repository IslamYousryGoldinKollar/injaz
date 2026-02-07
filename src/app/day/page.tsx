"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useUser } from "@/contexts/user-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getQuickTasks, createQuickTask, updateQuickTask, deleteQuickTask, getTasks } from "@/lib/actions/task-actions"
import { Plus, ChevronLeft, ChevronRight, Circle, CheckCircle2, Trash2, Calendar, Clock, ListTodo, Target } from "lucide-react"
import { cn } from "@/lib/utils"

/* eslint-disable @typescript-eslint/no-explicit-any */
function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0]
}

function formatDisplay(date: Date) {
  const today = formatDateKey(new Date())
  const key = formatDateKey(date)
  if (key === today) return "Today"
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  if (key === formatDateKey(tomorrow)) return "Tomorrow"
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  if (key === formatDateKey(yesterday)) return "Yesterday"
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

export default function DayPlannerPage() {
  const { authUser } = useAuth()
  const { currentUser } = useUser()
  const [date, setDate] = useState(new Date())
  const [tasks, setTasks] = useState<any[]>([])
  const [projectTasks, setProjectTasks] = useState<any[]>([])
  const [newTitle, setNewTitle] = useState("")

  const dateKey = formatDateKey(date)
  const load = useCallback(async () => {
    if (!authUser) return
    const t = await getQuickTasks(authUser.uid, dateKey)
    setTasks(t)

    // Also load project tasks due today
    const allTasks = await getTasks({})
    const todayKey = formatDateKey(date)
    const dueTasks = allTasks.filter((pt: any) => {
      if (pt.status === "Done") return false
      const due = pt.dueDate ? formatDateKey(new Date(pt.dueDate)) : null
      const start = pt.startDate ? formatDateKey(new Date(pt.startDate)) : null
      const end = pt.endDate ? formatDateKey(new Date(pt.endDate)) : null
      return due === todayKey || start === todayKey || (start && end && start <= todayKey && end >= todayKey)
    })
    setProjectTasks(dueTasks)
  }, [authUser, dateKey, date])
  useEffect(() => { void load() }, [load])

  const addTask = async () => {
    if (!newTitle.trim() || !authUser) return
    await createQuickTask({ ownerUid: authUser.uid, title: newTitle.trim(), date: dateKey })
    setNewTitle("")
    load()
  }

  const toggleTask = async (task: any) => {
    await updateQuickTask(task.id, { status: task.status === "Done" ? "Todo" : "Done" })
    load()
  }

  const removeTask = async (id: string) => {
    await deleteQuickTask(id)
    load()
  }

  const shiftDate = (days: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(d)
  }

  const doneCount = tasks.filter((t: any) => t.status === "Done").length
  const totalItems = tasks.length + projectTasks.length
  const totalDone = doneCount

  // Time of day greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Day Planner</h1>
          <p className="text-sm text-muted-foreground">{greeting}{currentUser ? `, ${currentUser.name.split(" ")[0]}` : ""}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setDate(new Date())} className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> {formatDisplay(date)}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftDate(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Progress */}
      {totalItems > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Daily Progress</span>
              </div>
              <span className="text-sm font-bold">{Math.round((totalDone / totalItems) * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full rounded-full transition-all duration-500", totalDone === totalItems ? "bg-emerald-500" : "bg-primary")}
                style={{ width: `${totalItems > 0 ? (totalDone / totalItems) * 100 : 0}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
              <span>{doneCount}/{tasks.length} quick tasks</span>
              <span>{projectTasks.length} project tasks due</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick task input */}
      <div className="flex gap-2">
        <Input placeholder="Add a quick task..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} className="h-10" />
        <Button onClick={addTask} disabled={!newTitle.trim()} className="h-10"><Plus className="h-4 w-4" /></Button>
      </div>

      {/* Quick Tasks */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Quick Tasks</h2>
          {tasks.length > 0 && <Badge variant="secondary" className="text-[10px]">{doneCount}/{tasks.length}</Badge>}
        </div>
        {tasks.length === 0 ? (
          <Card><CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No tasks for {formatDisplay(date).toLowerCase()}. Add one above!</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((t: any) => (
              <Card key={t.id} className="group">
                <CardContent className="flex items-center gap-3 p-3">
                  <button onClick={() => toggleTask(t)} className="shrink-0" title="Toggle status">
                    {t.status === "Done" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <span className={cn("flex-1 text-sm", t.status === "Done" && "line-through text-muted-foreground")}>
                    {t.title}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeTask(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Project Tasks Due Today */}
      {projectTasks.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Project Tasks Due</h2>
            <Badge variant="secondary" className="text-[10px]">{projectTasks.length}</Badge>
          </div>
          <div className="space-y-1.5">
            {projectTasks.map((t: any) => (
              <Card key={t.id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    t.status === "In Progress" ? "bg-blue-500" : t.status === "Blocked" ? "bg-rose-500" : "bg-slate-400"
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{t.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {t.project && <span style={{ color: t.project.color }}>{t.project.name}</span>}
                      {t.assignee && <span>→ {t.assignee.name}</span>}
                      {t.priority && <span>· {t.priority}</span>}
                    </div>
                  </div>
                  <Badge variant={t.status === "In Progress" ? "info" : "secondary"} className="text-[10px]">{t.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

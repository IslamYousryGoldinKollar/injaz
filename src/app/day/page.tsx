"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getQuickTasks, createQuickTask, updateQuickTask, deleteQuickTask } from "@/lib/actions/task-actions"
import { Plus, ChevronLeft, ChevronRight, Circle, CheckCircle2, Trash2, Calendar } from "lucide-react"
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
  const [date, setDate] = useState(new Date())
  const [tasks, setTasks] = useState<any[]>([])
  const [newTitle, setNewTitle] = useState("")

  const dateKey = formatDateKey(date)
  const load = useCallback(async () => {
    if (!authUser) return
    const t = await getQuickTasks(authUser.uid, dateKey)
    setTasks(t)
  }, [authUser, dateKey])
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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Day Planner</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(new Date())} className="gap-1">
            <Calendar className="h-3.5 w-3.5" /> {formatDisplay(date)}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftDate(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / tasks.length) * 100}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{doneCount}/{tasks.length}</span>
        </div>
      )}

      <div className="flex gap-2">
        <Input placeholder="Add a quick task..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} />
        <Button onClick={addTask} disabled={!newTitle.trim()}><Plus className="h-4 w-4" /></Button>
      </div>

      {tasks.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No tasks for {formatDisplay(date).toLowerCase()}. Add one above!</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((t: any) => (
            <Card key={t.id} className="group">
              <CardContent className="flex items-center gap-3 p-3">
                <button onClick={() => toggleTask(t)} className="shrink-0">
                  {t.status === "Done" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <span className={cn("flex-1 text-sm", t.status === "Done" && "line-through text-muted-foreground")}>
                  {t.title}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => removeTask(t.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

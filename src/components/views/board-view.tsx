"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Circle, CheckCircle2, Clock, AlertCircle, User } from "lucide-react"

export interface BoardTask {
  id: string
  title: string
  status: string
  priority?: string | null
  projectName?: string
  projectColor?: string
  assigneeName?: string
  dueDate: Date | null
}

interface BoardViewProps {
  tasks: BoardTask[]
  columns?: string[]
  onTaskClick?: (taskId: string) => void
  onStatusChange?: (taskId: string, newStatus: string) => void
}

const columnConfig: Record<string, { icon: typeof Circle; color: string; bg: string }> = {
  "Planned": { icon: Circle, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-900/40" },
  "In Progress": { icon: Clock, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40" },
  "Done": { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  "Blocked": { icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-950/40" },
}

const priorityColors: Record<string, string> = {
  "Urgent": "bg-rose-500",
  "High": "bg-amber-500",
  "Medium": "bg-blue-500",
  "Low": "bg-slate-400",
}

export function BoardView({ tasks, columns = ["Planned", "In Progress", "Done", "Blocked"], onTaskClick, onStatusChange }: BoardViewProps) {
  const grouped = useMemo(() => {
    const map: Record<string, BoardTask[]> = {}
    columns.forEach((c) => (map[c] = []))
    tasks.forEach((t) => {
      const col = columns.includes(t.status) ? t.status : columns[0]
      if (!map[col]) map[col] = []
      map[col].push(t)
    })
    return map
  }, [tasks, columns])

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => {
        const config = columnConfig[col] || columnConfig["Planned"]
        const Icon = config.icon
        const colTasks = grouped[col] || []

        return (
          <div key={col} className="w-[280px] shrink-0 rounded-lg border bg-card">
            {/* Column header */}
            <div className={cn("flex items-center gap-2 rounded-t-lg border-b px-3 py-2.5", config.bg)}>
              <Icon className={cn("h-4 w-4", config.color)} />
              <span className="text-sm font-semibold">{col}</span>
              <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs font-medium">{colTasks.length}</span>
            </div>

            {/* Cards */}
            <div className="space-y-2 p-2 min-h-[200px]">
              {colTasks.length === 0 ? (
                <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                  No tasks
                </div>
              ) : (
                colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="group cursor-pointer rounded-lg border bg-background p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
                    onClick={() => onTaskClick?.(task.id)}
                  >
                    {/* Priority dot + project */}
                    <div className="mb-2 flex items-center gap-2">
                      {task.priority && (
                        <div className={cn("h-2 w-2 rounded-full", priorityColors[task.priority] || "bg-slate-400")} title={task.priority} />
                      )}
                      {task.projectName && (
                        <span className="text-[10px] font-medium" style={{ color: task.projectColor || "#64748b" }}>
                          {task.projectName}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p className={cn("text-sm font-medium leading-snug", task.status === "Done" && "line-through text-muted-foreground")}>
                      {task.title}
                    </p>

                    {/* Footer */}
                    <div className="mt-2 flex items-center justify-between">
                      {task.assigneeName ? (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{task.assigneeName}</span>
                        </div>
                      ) : (
                        <span />
                      )}

                      {task.dueDate && (
                        <span className={cn(
                          "text-[10px]",
                          new Date(task.dueDate) < new Date() && task.status !== "Done" ? "text-rose-500 font-medium" : "text-muted-foreground"
                        )}>
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>

                    {/* Quick status buttons on hover */}
                    {onStatusChange && (
                      <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {columns.filter((s) => s !== task.status).map((s) => (
                          <button
                            key={s}
                            className="flex-1 rounded bg-accent px-1 py-0.5 text-[9px] font-medium hover:bg-accent/80 transition-colors truncate"
                            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, s) }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

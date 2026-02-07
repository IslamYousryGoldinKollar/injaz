"use client"

import { useMemo, useState } from "react"
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth,
  isToday, addMonths, subMonths,
} from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Circle, CheckCircle2, Clock, AlertCircle } from "lucide-react"

export interface CalendarTask {
  id: string
  title: string
  dueDate: Date | null
  startDate: Date | null
  endDate: Date | null
  status: string
  priority?: string | null
  projectName?: string
  projectColor?: string
  assigneeName?: string
}

interface CalendarViewProps {
  tasks: CalendarTask[]
  onTaskClick?: (taskId: string) => void
  onDayClick?: (date: Date) => void
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const statusIcon: Record<string, typeof Circle> = {
  "Planned": Circle,
  "In Progress": Clock,
  "Done": CheckCircle2,
  "Blocked": AlertCircle,
}

const statusColor: Record<string, string> = {
  "Planned": "text-slate-400",
  "In Progress": "text-blue-500",
  "Done": "text-emerald-500",
  "Blocked": "text-rose-500",
}

export function CalendarView({ tasks, onTaskClick, onDayClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>()
    tasks.forEach((t) => {
      const date = t.dueDate || t.startDate || t.endDate
      if (!date) return
      const key = format(date, "yyyy-MM-dd")
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    })
    return map
  }, [tasks])

  const noDateCount = tasks.filter(t => !t.dueDate && !t.startDate && !t.endDate).length

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCurrentMonth(new Date())}>
          Today
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const key = format(day, "yyyy-MM-dd")
          const dayTasks = tasksByDate.get(key) || []
          const inMonth = isSameMonth(day, currentMonth)
          const today = isToday(day)

          return (
            <div
              key={i}
              className={cn(
                "min-h-[100px] border-b border-r p-1 transition-colors cursor-pointer hover:bg-accent/30",
                !inMonth && "bg-muted/20",
                today && "bg-primary/5",
                i % 7 === 6 && "border-r-0"
              )}
              onClick={() => onDayClick?.(day)}
            >
              <div className={cn(
                "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                today && "bg-primary text-primary-foreground",
                !inMonth && "text-muted-foreground/40"
              )}>
                {format(day, "d")}
              </div>

              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => {
                  const Icon = statusIcon[task.status] || Circle
                  return (
                    <button
                      key={task.id}
                      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] leading-tight hover:bg-accent transition-colors truncate"
                      style={{ borderLeft: `2px solid ${task.projectColor || "#94a3b8"}` }}
                      onClick={(e) => { e.stopPropagation(); onTaskClick?.(task.id) }}
                      title={`${task.title}${task.assigneeName ? ` → ${task.assigneeName}` : ""}`}
                    >
                      <Icon className={cn("h-2.5 w-2.5 shrink-0", statusColor[task.status] || "text-muted-foreground")} />
                      <span className={cn("truncate", task.status === "Done" && "line-through text-muted-foreground")}>
                        {task.title}
                      </span>
                    </button>
                  )
                })}
                {dayTasks.length > 3 && (
                  <p className="px-1 text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {noDateCount > 0 && (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          {noDateCount} task(s) without dates are not shown on the calendar.
        </div>
      )}
    </div>
  )
}

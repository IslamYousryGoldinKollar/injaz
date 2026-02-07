"use client"

import { useMemo, useRef, useState } from "react"
import { addDays, differenceInDays, format, startOfDay, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameMonth, isWeekend } from "date-fns"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Diamond, ZoomIn, ZoomOut } from "lucide-react"


export interface GanttTask {
  id: string
  title: string
  startDate: Date | null
  endDate: Date | null
  dueDate: Date | null
  status: string
  priority?: string | null
  projectName?: string
  projectColor?: string
  assigneeName?: string
  isMilestone?: boolean
  progress?: number
}

interface GanttChartProps {
  tasks: GanttTask[]
  onTaskClick?: (taskId: string) => void
  onTaskDateChange?: (taskId: string, startDate: Date, endDate: Date) => void
}

const ROW_HEIGHT = 40
const HEADER_HEIGHT = 56


export function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<"day" | "week">("day")
  const [viewStart, setViewStart] = useState(() => {
    const earliest = tasks.reduce((min, t) => {
      const d = t.startDate || t.dueDate
      return d && d < min ? d : min
    }, new Date())
    return startOfWeek(addDays(earliest, -3))
  })

  const colWidth = zoom === "day" ? 36 : 20
  const daysToShow = zoom === "day" ? 60 : 120
  const viewEnd = addDays(viewStart, daysToShow)

  const days = useMemo(() => eachDayOfInterval({ start: viewStart, end: viewEnd }), [viewStart, viewEnd])

  const weeks = useMemo(() => {
    const w: { start: Date; end: Date; days: number }[] = []
    let cur = viewStart
    while (cur < viewEnd) {
      const wEnd = endOfWeek(cur)
      const end = wEnd > viewEnd ? viewEnd : wEnd
      w.push({ start: cur, end, days: differenceInDays(end, cur) + 1 })
      cur = addDays(end, 1)
    }
    return w
  }, [viewStart, viewEnd])

  const todayOffset = differenceInDays(startOfDay(new Date()), viewStart)
  const totalWidth = days.length * colWidth

  const getBarStyle = (task: GanttTask) => {
    const start = task.startDate || task.dueDate || task.endDate
    const end = task.endDate || task.dueDate || task.startDate
    if (!start || !end) return null

    const startOff = differenceInDays(startOfDay(start), viewStart)
    const duration = Math.max(1, differenceInDays(startOfDay(end), startOfDay(start)) + 1)

    return {
      left: startOff * colWidth,
      width: duration * colWidth - 4,
    }
  }

  const navigateView = (direction: number) => {
    setViewStart(prev => addDays(prev, direction * (zoom === "day" ? 14 : 30)))
  }

  const scrollToToday = () => {
    setViewStart(startOfWeek(addDays(new Date(), -7)))
    setTimeout(() => {
      if (scrollRef.current) {
        const todayPos = differenceInDays(new Date(), viewStart) * colWidth
        scrollRef.current.scrollLeft = todayPos - 200
      }
    }, 50)
  }

  const validTasks = tasks.filter(t => t.startDate || t.dueDate || t.endDate)
  const noDateTasks = tasks.filter(t => !t.startDate && !t.dueDate && !t.endDate)

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateView(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={scrollToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateView(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant={zoom === "day" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setZoom("day")}>
            <ZoomIn className="h-3 w-3 mr-1" /> Day
          </Button>
          <Button variant={zoom === "week" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setZoom("week")}>
            <ZoomOut className="h-3 w-3 mr-1" /> Week
          </Button>
        </div>
      </div>

      {validTasks.length === 0 && noDateTasks.length > 0 ? (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          All {noDateTasks.length} tasks have no dates set. Add start/end dates to see them on the Gantt chart.
        </div>
      ) : (
        <div className="flex overflow-hidden">
          {/* Left panel — task names */}
          <div className="w-[220px] shrink-0 border-r bg-card z-10">
            <div className="h-[56px] border-b px-3 flex items-end pb-2">
              <span className="text-xs font-medium text-muted-foreground">Task</span>
            </div>
            {validTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 border-b px-3 cursor-pointer hover:bg-accent/50 transition-colors"
                style={{ height: ROW_HEIGHT }}
                onClick={() => onTaskClick?.(task.id)}
              >
                {task.isMilestone && <Diamond className="h-3 w-3 text-amber-500 shrink-0" />}
                <span className={cn("text-sm truncate", task.status === "Done" && "line-through text-muted-foreground")}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>

          {/* Right panel — timeline */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
            <div style={{ width: totalWidth, minWidth: "100%" }}>
              {/* Timeline header */}
              <div className="sticky top-0 z-10 bg-card border-b" style={{ height: HEADER_HEIGHT }}>
                {/* Week row */}
                <div className="flex h-7 border-b">
                  {weeks.map((w, i) => (
                    <div
                      key={i}
                      className="border-r px-1 text-xs font-medium text-muted-foreground flex items-center"
                      style={{ width: w.days * colWidth }}
                    >
                      {format(w.start, "MMM d")} – {format(w.end, "MMM d")}
                    </div>
                  ))}
                </div>
                {/* Day row */}
                <div className="flex h-7">
                  {days.map((day, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-center border-r text-[10px]",
                        isToday(day) && "bg-primary/10 font-bold text-primary",
                        isWeekend(day) && "bg-muted/40",
                        !isSameMonth(day, viewStart) && "text-muted-foreground/50"
                      )}
                      style={{ width: colWidth }}
                    >
                      {zoom === "day" ? format(day, "d") : (day.getDate() === 1 ? format(day, "d") : "")}
                    </div>
                  ))}
                </div>
              </div>

              {/* Task bars */}
              <div className="relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {days.map((day, i) => (
                    <div
                      key={i}
                      className={cn(
                        "border-r h-full",
                        isWeekend(day) ? "bg-muted/20 border-border/40" : "border-border/20",
                        isToday(day) && "bg-primary/5"
                      )}
                      style={{ width: colWidth }}
                    />
                  ))}
                </div>

                {/* Today line */}
                {todayOffset >= 0 && todayOffset <= daysToShow && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none"
                    style={{ left: todayOffset * colWidth + colWidth / 2 }}
                  />
                )}

                {/* Bars */}
                {validTasks.map((task) => {
                  const bar = getBarStyle(task)
                  if (!bar) return null
                  const barColor = task.projectColor || "#3b82f6"
                  return (
                    <div
                      key={task.id}
                      className="relative border-b border-border/20"
                      style={{ height: ROW_HEIGHT }}
                    >
                      {task.isMilestone ? (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 cursor-pointer"
                          style={{ left: bar.left + bar.width / 2 }}
                          onClick={() => onTaskClick?.(task.id)}
                        >
                          <Diamond className="h-5 w-5 fill-amber-400 text-amber-600" />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 rounded-md h-6 cursor-pointer transition-shadow hover:shadow-md z-10",
                            "flex items-center px-2 text-[10px] text-white font-medium truncate"
                          )}
                          style={{
                            left: Math.max(0, bar.left),
                            width: Math.max(colWidth, bar.width),
                            backgroundColor: barColor,
                            opacity: task.status === "Done" ? 0.6 : 1,
                          }}
                          onClick={() => onTaskClick?.(task.id)}
                          title={`${task.title}${task.assigneeName ? ` → ${task.assigneeName}` : ""}`}
                        >
                          {bar.width > 60 && task.title}
                        </div>
                      )}

                      {/* Due date marker */}
                      {task.dueDate && task.endDate && differenceInDays(task.dueDate, task.endDate) !== 0 && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-rose-500 z-10"
                          style={{ left: differenceInDays(startOfDay(task.dueDate), viewStart) * colWidth + colWidth / 2 }}
                          title={`Due: ${format(task.dueDate, "MMM d")}`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks without dates */}
      {noDateTasks.length > 0 && validTasks.length > 0 && (
        <div className="border-t px-3 py-2">
          <p className="text-xs text-muted-foreground mb-1">{noDateTasks.length} task(s) without dates:</p>
          <div className="flex flex-wrap gap-1">
            {noDateTasks.slice(0, 8).map((t) => (
              <Badge key={t.id} variant="secondary" className="text-xs cursor-pointer" onClick={() => onTaskClick?.(t.id)}>
                {t.title}
              </Badge>
            ))}
            {noDateTasks.length > 8 && <Badge variant="secondary" className="text-xs">+{noDateTasks.length - 8} more</Badge>}
          </div>
        </div>
      )}
    </div>
  )
}

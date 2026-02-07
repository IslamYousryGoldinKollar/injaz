"use client"

import { useAuth } from "@/contexts/auth-context"
import { useUser } from "@/contexts/user-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getDashboardStats, getCategoryBreakdown, getMonthlyBreakdown, getProjectBreakdown, getTopParties, getOverdueAlerts } from "@/lib/actions/dashboard-actions"
import { formatCurrency, cn } from "@/lib/utils"
import { DashboardSkeleton } from "@/components/ui/skeleton"
import {
  TrendingUp, TrendingDown, Banknote, Users, FolderKanban, ListTodo,
  ArrowUpRight, ArrowDownLeft, Sparkles, AlertTriangle,
} from "lucide-react"
import Link from "next/link"

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function HomePage() {
  const { authUser } = useAuth()
  const { currentUser } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [monthly, setMonthly] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [topParties, setTopParties] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any>({ overduePayments: [], overdueTasks: [] })
  const [loading, setLoading] = useState(true)

  const orgId = currentUser?.organizationId

  useEffect(() => {
    if (!authUser) router.push("/login")
  }, [authUser, router])

  const load = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const [s, c, m, p, tp, al] = await Promise.all([
      getDashboardStats(orgId),
      getCategoryBreakdown(orgId),
      getMonthlyBreakdown(orgId),
      getProjectBreakdown(orgId),
      getTopParties(orgId),
      getOverdueAlerts(orgId),
    ])
    setStats(s); setCategories(c); setMonthly(m); setProjects(p); setTopParties(tp); setAlerts(al)
    setLoading(false)
  }, [orgId])
  useEffect(() => { void load() }, [load])

  if (!authUser || !currentUser) return null
  if (loading || !stats) {
    return <DashboardSkeleton />
  }

  const maxMonthly = Math.max(...monthly.map((m: any) => Math.max(m.income, m.expense)), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {currentUser.name.split(" ")[0]}</p>
        </div>
        <Link href="/ai">
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" /> AI Assistant
          </Button>
        </Link>
      </div>

      {/* Overdue Alerts */}
      {(alerts.overduePayments.length > 0 || alerts.overdueTasks.length > 0) && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="font-semibold text-amber-700 dark:text-amber-400">Action Required</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {alerts.overduePayments.length > 0 && (
                <Link href="/financials" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white/70 p-3 text-sm transition-colors hover:bg-white dark:border-amber-800 dark:bg-amber-950/30">
                  <Banknote className="h-4 w-4 text-amber-600" />
                  <span><strong>{alerts.overduePayments.length}</strong> overdue payment{alerts.overduePayments.length > 1 ? "s" : ""}</span>
                </Link>
              )}
              {alerts.overdueTasks.length > 0 && (
                <Link href="/tasks" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white/70 p-3 text-sm transition-colors hover:bg-white dark:border-amber-800 dark:bg-amber-950/30">
                  <ListTodo className="h-4 w-4 text-amber-600" />
                  <span><strong>{alerts.overdueTasks.length}</strong> overdue task{alerts.overdueTasks.length > 1 ? "s" : ""}</span>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalRevenue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(stats.completedRevenue)} collected · {formatCurrency(stats.plannedRevenue)} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <ArrowDownLeft className="h-4 w-4 text-rose-600" />
            </div>
            <p className="mt-1 text-2xl font-bold text-rose-600">{formatCurrency(stats.totalExpenses)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(stats.completedExpenses)} paid · {formatCurrency(stats.plannedExpenses)} planned
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Net Profit</p>
              {stats.netProfit >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-rose-600" />}
            </div>
            <p className={cn("mt-1 text-2xl font-bold", stats.netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {formatCurrency(stats.netProfit)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{stats.paymentCount} total transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-sm text-muted-foreground">Parties</span></div>
                <p className="text-xl font-bold">{stats.partyCount}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2"><FolderKanban className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-sm text-muted-foreground">Projects</span></div>
                <p className="text-xl font-bold">{stats.projectCount}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2"><ListTodo className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-sm text-muted-foreground">Tasks</span></div>
                <p className="text-xl font-bold">{stats.tasksDone}/{stats.taskCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Chart */}
        {monthly.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {monthly.slice(-8).map((m: any) => (
                  <div key={m.month} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{m.month}</span>
                      <span className={cn("font-medium", m.income - m.expense >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {formatCurrency(m.income - m.expense)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(m.income / maxMonthly) * 100}%` }} />
                      <div className="h-2 rounded-full bg-rose-400" style={{ width: `${(m.expense / maxMonthly) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Revenue</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> Expenses</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Breakdown */}
        {categories.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.slice(0, 10).map((c: any) => {
                  const maxCat = categories[0]?.total || 1
                  return (
                    <div key={c.name} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate font-medium">{c.name}</span>
                          <span className="text-muted-foreground">{formatCurrency(c.total)} ({c.count})</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn("h-full rounded-full", c.type === "INBOUND" ? "bg-emerald-500" : "bg-rose-400")}
                            style={{ width: `${(c.total / maxCat) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Breakdown */}
        {projects.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projects.slice(0, 8).map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color || "#3b82f6" }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm font-medium">{p.name}</span>
                        <Badge variant={p.profit >= 0 ? "success" : "destructive"} className="text-xs">
                          {formatCurrency(p.profit)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="text-emerald-600">+{formatCurrency(p.income)}</span>
                        <span className="text-rose-500">-{formatCurrency(p.expense)}</span>
                        <span>· {p.paymentCount} payments</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Parties */}
        {topParties.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Parties by Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topParties.map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center gap-3 text-sm">
                    <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="truncate font-medium">{p.name}</span>
                    </div>
                    <Badge variant={p.type === "CLIENT" ? "info" : "warning"} className="text-xs">{p.type}</Badge>
                    <span className="text-xs font-medium">{formatCurrency(p.totalVolume)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Payments */}
      {stats.recentPayments?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Payments</CardTitle>
              <Link href="/financials"><Button variant="ghost" size="sm">View All</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {stats.recentPayments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", p.direction === "INBOUND" ? "bg-emerald-50" : "bg-rose-50")}>
                      {p.direction === "INBOUND" ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownLeft className="h-4 w-4 text-rose-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.description || p.number}</p>
                      <p className="text-xs text-muted-foreground">{p.party?.name} · {p.category?.name || "Uncategorized"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-semibold", p.direction === "INBOUND" ? "text-emerald-600" : "text-rose-600")}>
                      {p.direction === "INBOUND" ? "+" : "-"}{formatCurrency(Number(p.expectedAmount))}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(p.plannedDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {stats.paymentCount === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Banknote className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-1 font-semibold">No data yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">Import your transactions to see the dashboard come alive.</p>
            <Link href="/import"><Button>Import CSV Data</Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

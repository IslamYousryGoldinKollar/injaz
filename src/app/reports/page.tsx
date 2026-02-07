"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getDashboardStats, getCategoryBreakdown, getMonthlyBreakdown, getProjectBreakdown } from "@/lib/actions/dashboard-actions"
import { formatCurrency, cn } from "@/lib/utils"
import { BarChart3, TrendingUp, TrendingDown, PieChart } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ReportsPage() {
  const { currentUser } = useUser()
  const orgId = currentUser?.organizationId
  const [stats, setStats] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [monthly, setMonthly] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [view, setView] = useState<"overview" | "monthly" | "categories" | "projects">("overview")

  const load = useCallback(async () => {
    if (!orgId) return
    const [s, c, m, p] = await Promise.all([
      getDashboardStats(orgId),
      getCategoryBreakdown(orgId),
      getMonthlyBreakdown(orgId),
      getProjectBreakdown(orgId),
    ])
    setStats(s); setCategories(c); setMonthly(m); setProjects(p)
  }, [orgId])
  useEffect(() => { void load() }, [load])

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <BarChart3 className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    )
  }

  const maxMonthly = Math.max(...monthly.map((m: any) => Math.max(m.income, m.expense)), 1)
  const maxCat = categories[0]?.total || 1
  const profitMargin = stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1">
        {[
          { key: "overview", label: "Overview", icon: BarChart3 },
          { key: "monthly", label: "Monthly", icon: TrendingUp },
          { key: "categories", label: "Categories", icon: PieChart },
          { key: "projects", label: "Projects", icon: TrendingDown },
        ].map((t) => (
          <Button key={t.key} variant={view === t.key ? "default" : "ghost"} size="sm" className="gap-1.5" onClick={() => setView(t.key as any)}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </Button>
        ))}
      </div>

      {/* Overview */}
      {view === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-rose-600">{formatCurrency(stats.totalExpenses)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={cn("text-2xl font-bold", stats.netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(stats.netProfit)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className={cn("text-2xl font-bold", Number(profitMargin) >= 0 ? "text-emerald-600" : "text-rose-600")}>{profitMargin}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold">{stats.paymentCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Active Projects</p>
                <p className="text-xl font-bold">{stats.projectCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Task Completion</p>
                <p className="text-xl font-bold">{stats.tasksDone}/{stats.taskCount}</p>
                {stats.taskCount > 0 && (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(stats.tasksDone / stats.taskCount) * 100}%` }} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Monthly Breakdown */}
      {view === "monthly" && (
        <Card>
          <CardHeader><CardTitle>Monthly Cash Flow</CardTitle></CardHeader>
          <CardContent>
            {monthly.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No monthly data available.</p>
            ) : (
              <div className="space-y-3">
                {monthly.map((m: any) => {
                  const net = m.income - m.expense
                  return (
                    <div key={m.month} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{m.month}</span>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-emerald-600">+{formatCurrency(m.income)}</span>
                          <span className="text-rose-600">-{formatCurrency(m.expense)}</span>
                          <span className={cn("font-semibold", net >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {formatCurrency(net)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 h-3">
                        <div className="rounded-full bg-emerald-500" style={{ width: `${(m.income / maxMonthly) * 100}%` }} />
                        <div className="rounded-full bg-rose-400" style={{ width: `${(m.expense / maxMonthly) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {view === "categories" && (
        <Card>
          <CardHeader><CardTitle>Spending by Category</CardTitle></CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No category data available.</p>
            ) : (
              <div className="space-y-3">
                {categories.map((c: any) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{c.count} payments</span>
                        <span className="font-semibold">{formatCurrency(c.total)}</span>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn("h-full rounded-full", c.type === "INBOUND" ? "bg-emerald-500" : "bg-rose-400")}
                        style={{ width: `${(c.total / maxCat) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Project Breakdown */}
      {view === "projects" && (
        <Card>
          <CardHeader><CardTitle>Project Profitability</CardTitle></CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No project data available.</p>
            ) : (
              <div className="space-y-4">
                {projects.map((p: any) => (
                  <div key={p.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color || "#3b82f6" }} />
                        <span className="font-medium">{p.name}</span>
                      </div>
                      <span className={cn("font-bold", p.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {formatCurrency(p.profit)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Revenue</span><p className="font-medium text-emerald-600">{formatCurrency(p.income)}</p></div>
                      <div><span className="text-muted-foreground">Expenses</span><p className="font-medium text-rose-600">{formatCurrency(p.expense)}</p></div>
                      <div><span className="text-muted-foreground">Payments</span><p className="font-medium">{p.paymentCount}</p></div>
                    </div>
                    {p.income > 0 && (
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min((p.income / (p.income + p.expense)) * 100, 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

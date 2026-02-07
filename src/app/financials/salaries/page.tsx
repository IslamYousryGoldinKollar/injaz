"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SlideOver } from "@/components/ui/slide-over"
import { Combobox } from "@/components/ui/combobox"
import { getSalaries, createSalary, updateSalary, deleteSalary, getSalaryStats } from "@/lib/actions/salary-actions"
import { formatCurrency, cn } from "@/lib/utils"
import { Plus, Trash2, Wallet, Clock, CheckCircle2, AlertCircle, Ban } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
const statusColors: Record<string, string> = {
  SCHEDULED: "warning",
  DEFERRED: "info",
  PARTIAL: "secondary",
  PAID: "success",
  CANCELLED: "destructive",
}

const statusIcons: Record<string, any> = {
  SCHEDULED: Clock,
  DEFERRED: AlertCircle,
  PARTIAL: Wallet,
  PAID: CheckCircle2,
  CANCELLED: Ban,
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export default function SalariesPage() {
  const { allUsers } = useUser()
  const [salaries, setSalaries] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, count: 0 })
  const [monthFilter, setMonthFilter] = useState(currentMonth())
  const [statusFilter, setStatusFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({
    userId: "", month: currentMonth(), grossAmount: "", deductions: "0", netAmount: "",
    scheduledDate: new Date().toISOString().split("T")[0],
  })

  const load = useCallback(async () => {
    const filters: any = {}
    if (monthFilter) filters.month = monthFilter
    if (statusFilter) filters.status = statusFilter
    const [s, st] = await Promise.all([
      getSalaries(filters),
      getSalaryStats({ month: monthFilter || undefined }),
    ])
    setSalaries(s)
    setStats(st)
  }, [monthFilter, statusFilter])
  useEffect(() => { void load() }, [load])

  const handleCreate = async () => {
    if (!form.userId || !form.grossAmount) return
    const gross = parseFloat(form.grossAmount)
    const deductions = parseFloat(form.deductions || "0")
    const net = form.netAmount ? parseFloat(form.netAmount) : gross - deductions
    await createSalary({
      userId: form.userId,
      month: form.month,
      grossAmount: gross,
      deductions: { total: deductions },
      netAmount: net,
      scheduledDate: new Date(form.scheduledDate),
    })
    setShowCreate(false)
    setForm({ userId: "", month: currentMonth(), grossAmount: "", deductions: "0", netAmount: "", scheduledDate: new Date().toISOString().split("T")[0] })
    load()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await updateSalary(id, { status })
    if (selected?.id === id) {
      setSelected({ ...selected, status })
    }
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this salary record?")) return
    await deleteSalary(id)
    setSelected(null)
    load()
  }

  // Auto-calculate net
  const gross = parseFloat(form.grossAmount || "0")
  const ded = parseFloat(form.deductions || "0")
  const autoNet = gross - ded

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Salaries</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Salary</Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Gross</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
            <p className="text-xs text-muted-foreground">{stats.count} records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.pending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-40" />
        <div className="flex gap-1">
          {["", "SCHEDULED", "DEFERRED", "PARTIAL", "PAID", "CANCELLED"].map((s) => (
            <Button key={s} variant={statusFilter === s ? "default" : "ghost"} size="sm" onClick={() => setStatusFilter(s)}>
              {s || "All"}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {salaries.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Wallet className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No salary records for this period.</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y">
            {salaries.map((s: any) => {
              const StatusIcon = statusIcons[s.status] || Clock
              return (
                <button key={s.id} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors" onClick={() => setSelected(s)}>
                  <div className="flex items-center gap-3">
                    <StatusIcon className={cn("h-4 w-4", s.status === "PAID" ? "text-emerald-600" : s.status === "DEFERRED" ? "text-blue-500" : "text-muted-foreground")} />
                    <div>
                      <p className="font-medium">{s.user?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{s.month} · Scheduled {new Date(s.scheduledDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(Number(s.netAmount))}</p>
                    <Badge variant={statusColors[s.status] as any} className="text-xs">{s.status}</Badge>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Create */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="New Salary Record">
        <div className="space-y-4">
          <Combobox
            options={allUsers.map((u: any) => ({ value: u.id, label: u.name }))}
            value={form.userId}
            onValueChange={(v) => setForm({ ...form, userId: v })}
            placeholder="Select employee *"
          />
          <div><label className="mb-1 block text-xs font-medium">Month</label><Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="mb-1 block text-xs font-medium">Gross</label><Input type="number" value={form.grossAmount} onChange={(e) => setForm({ ...form, grossAmount: e.target.value })} placeholder="0" /></div>
            <div><label className="mb-1 block text-xs font-medium">Deductions</label><Input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} placeholder="0" /></div>
            <div><label className="mb-1 block text-xs font-medium">Net</label><Input type="number" value={form.netAmount || String(autoNet)} onChange={(e) => setForm({ ...form, netAmount: e.target.value })} placeholder={String(autoNet)} /></div>
          </div>
          <div><label className="mb-1 block text-xs font-medium">Scheduled Date</label><Input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} /></div>
          <Button className="w-full" onClick={handleCreate} disabled={!form.userId || !form.grossAmount}>Create Salary Record</Button>
        </div>
      </SlideOver>

      {/* Detail */}
      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={`${selected?.user?.name} — ${selected?.month}`}>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Badge variant={statusColors[selected.status] as any}>{selected.status}</Badge>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(selected.id)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Employee</p><p className="text-sm font-medium">{selected.user?.name}</p></div>
              <div><p className="text-xs text-muted-foreground">Month</p><p className="text-sm">{selected.month}</p></div>
              <div><p className="text-xs text-muted-foreground">Gross Amount</p><p className="text-sm font-semibold">{formatCurrency(Number(selected.grossAmount))}</p></div>
              <div><p className="text-xs text-muted-foreground">Deductions</p><p className="text-sm">{formatCurrency(Number((selected.deductions as any)?.total || 0))}</p></div>
              <div><p className="text-xs text-muted-foreground">Net Amount</p><p className="text-sm font-bold text-primary">{formatCurrency(Number(selected.netAmount))}</p></div>
              <div><p className="text-xs text-muted-foreground">Paid Amount</p><p className="text-sm text-emerald-600">{formatCurrency(Number(selected.paidAmount))}</p></div>
              <div><p className="text-xs text-muted-foreground">Scheduled Date</p><p className="text-sm">{new Date(selected.scheduledDate).toLocaleDateString()}</p></div>
              {selected.deferredUntil && <div><p className="text-xs text-muted-foreground">Deferred Until</p><p className="text-sm text-amber-600">{new Date(selected.deferredUntil).toLocaleDateString()}</p></div>}
              {selected.deferralReason && <div className="col-span-2"><p className="text-xs text-muted-foreground">Deferral Reason</p><p className="text-sm">{selected.deferralReason}</p></div>}
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Update Status</h3>
              <div className="flex flex-wrap gap-1">
                {["SCHEDULED", "DEFERRED", "PARTIAL", "PAID", "CANCELLED"].map((s) => (
                  <Button key={s} variant={selected.status === s ? "default" : "outline"} size="sm" className="text-xs" onClick={() => handleStatusChange(selected.id, s)}>
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

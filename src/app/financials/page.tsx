"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge, StatusBadge } from "@/components/ui/badge"
import { Combobox } from "@/components/ui/combobox"
import { SlideOver } from "@/components/ui/slide-over"
import { getPayments, getPaymentById, getFinancialSummary, getCategories, createPayment, updatePayment, deletePayment, getNextPaymentNumber } from "@/lib/actions/financial-actions"
import { getParties } from "@/lib/actions/party-actions"
import { getProjects } from "@/lib/actions/project-actions"
import { formatCurrency, cn } from "@/lib/utils"
import { Plus, TrendingUp, TrendingDown, Banknote, ArrowUpRight, ArrowDownLeft, Trash2, Search } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function FinancialsPage() {
  const { currentUser } = useUser()
  const [payments, setPayments] = useState<any[]>([])
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, netProfit: 0 })
  const [parties, setParties] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [dirFilter, setDirFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [form, setForm] = useState({ direction: "OUTBOUND", partyId: "", categoryId: "", projectId: "", amount: "", description: "", date: new Date().toISOString().split("T")[0], status: "PLANNED" })

  const orgId = currentUser?.organizationId
  const load = useCallback(async () => {
    if (!orgId) return
    const [p, s, pts, cats, prj] = await Promise.all([
      getPayments(orgId, {
        ...(dirFilter ? { direction: dirFilter as any } : {}),
        ...(statusFilter ? { status: statusFilter as any } : {}),
      }),
      getFinancialSummary(orgId),
      getParties(orgId),
      getCategories(orgId),
      getProjects(orgId),
    ])
    setPayments(p); setSummary(s); setParties(pts); setCategories(cats); setProjects(prj)
  }, [orgId, dirFilter, statusFilter])
  useEffect(() => { void load() }, [load])

  const handleCreate = async () => {
    if (!orgId || !currentUser || !form.partyId || !form.amount) return
    const num = await getNextPaymentNumber(orgId, form.direction as any)
    await createPayment({
      organizationId: orgId,
      number: num,
      direction: form.direction as any,
      partyId: form.partyId,
      categoryId: form.categoryId || undefined,
      projectId: form.projectId || undefined,
      plannedDate: new Date(form.date),
      expectedAmount: parseFloat(form.amount),
      description: form.description,
      status: form.status as any,
      actualDate: form.status === "COMPLETED" ? new Date(form.date) : undefined,
      actualAmount: form.status === "COMPLETED" ? parseFloat(form.amount) : undefined,
      createdById: currentUser.id,
    })
    setShowCreate(false)
    setForm({ direction: "OUTBOUND", partyId: "", categoryId: "", projectId: "", amount: "", description: "", date: new Date().toISOString().split("T")[0], status: "PLANNED" })
    load()
  }

  const handleSelect = async (id: string) => {
    const p = await getPaymentById(id)
    setSelected(p)
  }

  const handleStatusChange = async (id: string, status: string) => {
    await updatePayment(id, {
      status: status as any,
      ...(status === "COMPLETED" ? { actualDate: new Date(), actualAmount: Number(selected?.expectedAmount) } : {}),
    })
    const updated = await getPaymentById(id)
    setSelected(updated)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment?")) return
    await deletePayment(id)
    setSelected(null)
    load()
  }

  const filtered = payments.filter((p: any) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return p.party?.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.number?.toLowerCase().includes(q) ||
      p.category?.name?.toLowerCase().includes(q)
  })

  const kpis = [
    { label: "Revenue", value: formatCurrency(summary.revenue), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Expenses", value: formatCurrency(summary.expenses), icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Net Profit", value: formatCurrency(summary.netProfit), icon: Banknote, color: summary.netProfit >= 0 ? "text-emerald-600" : "text-rose-600", bg: summary.netProfit >= 0 ? "bg-emerald-50" : "bg-rose-50" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financials</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Payment</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <div className={`rounded-lg p-1.5 ${s.bg}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{s.value}</p></CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search payments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {["", "INBOUND", "OUTBOUND"].map((d) => (
            <Button key={d} variant={dirFilter === d ? "default" : "ghost"} size="sm" onClick={() => setDirFilter(d)}>
              {d === "" ? "All" : d === "INBOUND" ? "Income" : "Expenses"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {["", "PLANNED", "COMPLETED", "CANCELLED"].map((s) => (
            <Button key={s} variant={statusFilter === s ? "default" : "ghost"} size="sm" onClick={() => setStatusFilter(s)}>
              {s || "Any Status"}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Payments ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No payments found.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((p: any) => (
                <button key={p.id} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors" onClick={() => handleSelect(p.id)}>
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", p.direction === "INBOUND" ? "bg-emerald-50" : "bg-rose-50")}>
                      {p.direction === "INBOUND" ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> : <ArrowUpRight className="h-4 w-4 text-rose-600" />}
                    </div>
                    <div>
                      <p className="font-medium">{p.party?.name}</p>
                      <p className="text-xs text-muted-foreground">{p.description || p.number}{p.category ? ` · ${p.category.name}` : ""}{p.project ? ` · ${p.project.name}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className={cn("font-semibold", p.direction === "INBOUND" ? "text-emerald-600" : "text-rose-600")}>
                        {p.direction === "INBOUND" ? "+" : "-"}{formatCurrency(Number(p.expectedAmount))}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(p.plannedDate).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Payment */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="New Payment">
        <div className="space-y-4">
          <div className="flex gap-2">
            {["OUTBOUND", "INBOUND"].map((d) => (
              <Button key={d} variant={form.direction === d ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, direction: d })} className="flex-1">
                {d === "INBOUND" ? "Money In" : "Money Out"}
              </Button>
            ))}
          </div>
          <Combobox options={parties.map((p: any) => ({ value: p.id, label: p.name, sublabel: p.type }))} value={form.partyId} onValueChange={(v) => setForm({ ...form, partyId: v })} placeholder="Select party *" searchPlaceholder="Search vendors, clients..." />
          <Combobox options={categories.map((c: any) => ({ value: c.id, label: c.name }))} value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })} placeholder="Category (optional)" />
          <Combobox options={projects.map((p: any) => ({ value: p.id, label: p.name }))} value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })} placeholder="Project (optional)" />
          <Input type="number" placeholder="Amount *" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2">
            {["PLANNED", "COMPLETED"].map((s) => (
              <Button key={s} variant={form.status === s ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, status: s })} className="flex-1 text-xs">
                {s}
              </Button>
            ))}
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={!form.partyId || !form.amount}>Create Payment</Button>
        </div>
      </SlideOver>

      {/* Payment Detail */}
      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={selected?.number} wide>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={selected.direction === "INBOUND" ? "success" : "destructive"}>{selected.direction === "INBOUND" ? "Income" : "Expense"}</Badge>
                <StatusBadge status={selected.status} />
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(selected.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg bg-secondary/50 p-4 text-center">
              <p className={cn("text-3xl font-bold", selected.direction === "INBOUND" ? "text-emerald-600" : "text-rose-600")}>
                {selected.direction === "INBOUND" ? "+" : "-"}{formatCurrency(Number(selected.expectedAmount))}
              </p>
              {Number(selected.actualAmount) > 0 && Number(selected.actualAmount) !== Number(selected.expectedAmount) && (
                <p className="mt-1 text-sm text-muted-foreground">Actual: {formatCurrency(Number(selected.actualAmount))}</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Party</p><p className="text-sm font-medium">{selected.party?.name}</p></div>
              <div><p className="text-xs text-muted-foreground">Category</p><p className="text-sm">{selected.category?.name || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Project</p><p className="text-sm">{selected.project?.name || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Method</p><p className="text-sm">{selected.method || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Planned Date</p><p className="text-sm">{new Date(selected.plannedDate).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Actual Date</p><p className="text-sm">{selected.actualDate ? new Date(selected.actualDate).toLocaleDateString() : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Created By</p><p className="text-sm">{selected.createdBy?.name}</p></div>
              {selected.reference && <div><p className="text-xs text-muted-foreground">Reference</p><p className="text-sm">{selected.reference}</p></div>}
            </div>

            {selected.description && <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{selected.description}</p></div>}
            {selected.notes && <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{selected.notes}</p></div>}

            <div>
              <h3 className="mb-2 font-semibold">Update Status</h3>
              <div className="flex flex-wrap gap-1">
                {["PLANNED", "PENDING", "COMPLETED", "PARTIAL", "CANCELLED"].map((s) => (
                  <Button key={s} variant={selected.status === s ? "default" : "outline"} size="sm" className="text-xs" onClick={() => handleStatusChange(selected.id, s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>

            {selected.allocations?.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Linked Documents</h3>
                <div className="divide-y rounded-lg border">
                  {selected.allocations.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{a.document?.number} ({a.document?.type})</span>
                      <span className="font-medium">{formatCurrency(Number(a.amount))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOver>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge, StatusBadge } from "@/components/ui/badge"
import { Combobox } from "@/components/ui/combobox"
import { SlideOver } from "@/components/ui/slide-over"
import { getPayments, getPaymentById, getFinancialSummary, getCategories, createPayment, updatePayment, deletePayment, getNextPaymentNumber } from "@/lib/actions/financial-actions"
import { getParties, createParty } from "@/lib/actions/party-actions"
import { getProjects } from "@/lib/actions/project-actions"
import { formatCurrency, cn } from "@/lib/utils"
import {
  Plus, TrendingUp, TrendingDown, Banknote, ArrowUpRight, ArrowDownLeft,
  Trash2, Search, Receipt, Percent, Building2, CreditCard, X,
} from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ───────────────────────────────────────────────────────────────────
interface PaymentForm {
  direction: string
  partyId: string
  categoryId: string
  projectId: string
  amount: string           // original/subtotal amount
  vatEnabled: boolean
  vatRate: number          // e.g. 0.14
  taxDeductionEnabled: boolean
  taxRate: number          // e.g. 0.03
  method: string
  date: string
  status: string
  description: string
  reference: string
  notes: string
}

const EMPTY_FORM: PaymentForm = {
  direction: "OUTBOUND",
  partyId: "",
  categoryId: "",
  projectId: "",
  amount: "",
  vatEnabled: false,
  vatRate: 0.14,
  taxDeductionEnabled: false,
  taxRate: 0.03,
  method: "",
  date: new Date().toISOString().split("T")[0],
  status: "PLANNED",
  description: "",
  reference: "",
  notes: "",
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHECK", label: "Check" },
  { value: "INSTAPAY", label: "InstaPay" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "OTHER", label: "Other" },
]

// ─── Calculation Helper ──────────────────────────────────────────────────────
function calcBreakdown(amount: string, vatEnabled: boolean, vatRate: number, taxEnabled: boolean, taxRate: number) {
  const subtotal = parseFloat(amount) || 0
  const incomeTax = taxEnabled ? Math.round(subtotal * taxRate * 100) / 100 : 0
  const vatAmount = vatEnabled ? Math.round(subtotal * vatRate * 100) / 100 : 0
  const netPayable = Math.round((subtotal + vatAmount - incomeTax) * 100) / 100
  return { subtotal, incomeTax, vatAmount, netPayable }
}

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
  const [form, setForm] = useState<PaymentForm>({ ...EMPTY_FORM })
  const [showNewParty, setShowNewParty] = useState(false)
  const [newPartyName, setNewPartyName] = useState("")
  const [newPartyType, setNewPartyType] = useState("VENDOR")
  const [creating, setCreating] = useState(false)

  const orgId = currentUser?.organizationId

  // ─── Data Loading ────────────────────────────────────────────────────────
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

  // ─── Auto-fill Party Defaults ────────────────────────────────────────────
  const handlePartyChange = (partyId: string) => {
    const party = parties.find((p: any) => p.id === partyId)
    setForm((prev) => ({
      ...prev,
      partyId,
      vatEnabled: party?.hasVat ?? false,
      vatRate: party?.vatRate ? Number(party.vatRate) : 0.14,
      taxDeductionEnabled: party?.hasIncomeTaxDeduction ?? false,
      taxRate: party?.incomeTaxRate ? Number(party.incomeTaxRate) : 0.03,
    }))
  }

  // ─── Live Calculation ────────────────────────────────────────────────────
  const breakdown = useMemo(
    () => calcBreakdown(form.amount, form.vatEnabled, form.vatRate, form.taxDeductionEnabled, form.taxRate),
    [form.amount, form.vatEnabled, form.vatRate, form.taxDeductionEnabled, form.taxRate]
  )

  // ─── Create Inline Party ────────────────────────────────────────────────
  const handleCreateParty = async () => {
    if (!orgId || !newPartyName.trim()) return
    const party = await createParty({
      organizationId: orgId,
      name: newPartyName.trim(),
      type: newPartyType as any,
    })
    setParties((prev) => [...prev, party].sort((a, b) => a.name.localeCompare(b.name)))
    handlePartyChange(party.id)
    setShowNewParty(false)
    setNewPartyName("")
  }

  // ─── Create Payment ──────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!orgId || !currentUser || !form.partyId || !form.amount) return
    setCreating(true)
    try {
      const num = await getNextPaymentNumber(orgId, form.direction as any)
      const isCompleted = form.status === "COMPLETED"
      await createPayment({
        organizationId: orgId,
        number: num,
        direction: form.direction as any,
        partyId: form.partyId,
        categoryId: form.categoryId || undefined,
        projectId: form.projectId || undefined,
        plannedDate: new Date(form.date),
        expectedAmount: breakdown.netPayable,
        description: buildDescription(),
        status: form.status as any,
        method: form.method ? (form.method as any) : undefined,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
        actualDate: isCompleted ? new Date(form.date) : undefined,
        actualAmount: isCompleted ? breakdown.netPayable : undefined,
        createdById: currentUser.id,
      })
      setShowCreate(false)
      setForm({ ...EMPTY_FORM })
      load()
    } finally {
      setCreating(false)
    }
  }

  // Build a rich description with the calculation breakdown
  const buildDescription = () => {
    const parts = [form.description]
    if (form.vatEnabled || form.taxDeductionEnabled) {
      const items: string[] = []
      items.push(`Subtotal: ${breakdown.subtotal.toFixed(2)}`)
      if (form.taxDeductionEnabled) items.push(`Tax ${(form.taxRate * 100).toFixed(0)}%: -${breakdown.incomeTax.toFixed(2)}`)
      if (form.vatEnabled) items.push(`VAT ${(form.vatRate * 100).toFixed(0)}%: +${breakdown.vatAmount.toFixed(2)}`)
      items.push(`Net: ${breakdown.netPayable.toFixed(2)}`)
      parts.push(`[${items.join(" | ")}]`)
    }
    return parts.filter(Boolean).join(" ")
  }

  // ─── Detail Handlers ─────────────────────────────────────────────────────
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

  // ─── Filtered List ────────────────────────────────────────────────────────
  const filtered = payments.filter((p: any) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return p.party?.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.number?.toLowerCase().includes(q) ||
      p.category?.name?.toLowerCase().includes(q)
  })

  const kpis = [
    { label: "Revenue", value: formatCurrency(summary.revenue), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
    { label: "Expenses", value: formatCurrency(summary.expenses), icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/40" },
    { label: "Net Profit", value: formatCurrency(summary.netProfit), icon: Banknote, color: summary.netProfit >= 0 ? "text-emerald-600" : "text-rose-600", bg: summary.netProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-rose-50 dark:bg-rose-950/40" },
  ]

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financials</h1>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Payment</Button>
      </div>

      {/* KPI Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <div className={cn("rounded-lg p-1.5", s.bg)}><s.icon className={cn("h-4 w-4", s.color)} /></div>
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

      {/* Payments List */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Payments ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No payments found.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((p: any) => (
                <button key={p.id} className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/50" onClick={() => handleSelect(p.id)}>
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", p.direction === "INBOUND" ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-rose-50 dark:bg-rose-950/40")}>
                      {p.direction === "INBOUND" ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> : <ArrowUpRight className="h-4 w-4 text-rose-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.party?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.description || p.number}{p.category ? ` · ${p.category.name}` : ""}{p.project ? ` · ${p.project.name}` : ""}</p>
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CREATE PAYMENT SLIDE-OVER                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <SlideOver open={showCreate} onClose={() => { setShowCreate(false); setForm({ ...EMPTY_FORM }); setShowNewParty(false) }} title="New Payment" wide>
        <div className="space-y-5">

          {/* ── 1. Direction ── */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, direction: "OUTBOUND" }))}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-all",
                  form.direction === "OUTBOUND"
                    ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                    : "border-transparent bg-secondary text-muted-foreground hover:border-border"
                )}
              >
                <ArrowUpRight className="h-4 w-4" /> Money Out
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, direction: "INBOUND" }))}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-all",
                  form.direction === "INBOUND"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "border-transparent bg-secondary text-muted-foreground hover:border-border"
                )}
              >
                <ArrowDownLeft className="h-4 w-4" /> Money In
              </button>
            </div>
          </div>

          {/* ── 2. Party / Vendor ── */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {form.direction === "OUTBOUND" ? "Pay To (Vendor/Party)" : "Receive From (Client/Party)"} *
            </label>
            {!showNewParty ? (
              <Combobox
                options={parties.map((p: any) => ({ value: p.id, label: p.name, sublabel: p.type }))}
                value={form.partyId}
                onValueChange={handlePartyChange}
                placeholder={form.direction === "OUTBOUND" ? "Select vendor..." : "Select client..."}
                searchPlaceholder="Search parties..."
                onCreateNew={(search) => { setNewPartyName(search); setShowNewParty(true) }}
                createNewLabel="+ Add New Party"
              />
            ) : (
              <div className="space-y-2 rounded-lg border bg-secondary/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">New Party</span>
                  <button type="button" onClick={() => setShowNewParty(false)}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                </div>
                <Input
                  placeholder="Party name *"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-1">
                  {["VENDOR", "CLIENT", "EMPLOYEE", "OTHER"].map((t) => (
                    <Button key={t} variant={newPartyType === t ? "default" : "outline"} size="sm" className="flex-1 text-xs" onClick={() => setNewPartyType(t)}>
                      {t}
                    </Button>
                  ))}
                </div>
                <Button size="sm" className="w-full" onClick={handleCreateParty} disabled={!newPartyName.trim()}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Create & Select
                </Button>
              </div>
            )}
          </div>

          {/* ── 3. Amount + Tax Toggles ── */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original Amount (Subtotal) *</label>
            <Input
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="text-lg font-semibold"
              min="0"
              step="0.01"
            />
          </div>

          {/* Tax toggles row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Income Tax Deduction */}
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, taxDeductionEnabled: !f.taxDeductionEnabled }))}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all",
                form.taxDeductionEnabled
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : "border-transparent bg-secondary"
              )}
            >
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", form.taxDeductionEnabled ? "bg-amber-100 dark:bg-amber-900" : "bg-background")}>
                <Percent className={cn("h-4 w-4", form.taxDeductionEnabled ? "text-amber-600" : "text-muted-foreground")} />
              </div>
              <div>
                <p className={cn("text-sm font-semibold", form.taxDeductionEnabled ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                  Tax {(form.taxRate * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-muted-foreground">{form.taxDeductionEnabled ? "ON — deducted" : "OFF"}</p>
              </div>
            </button>

            {/* VAT */}
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, vatEnabled: !f.vatEnabled }))}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all",
                form.vatEnabled
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "border-transparent bg-secondary"
              )}
            >
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", form.vatEnabled ? "bg-blue-100 dark:bg-blue-900" : "bg-background")}>
                <Receipt className={cn("h-4 w-4", form.vatEnabled ? "text-blue-600" : "text-muted-foreground")} />
              </div>
              <div>
                <p className={cn("text-sm font-semibold", form.vatEnabled ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground")}>
                  VAT {(form.vatRate * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-muted-foreground">{form.vatEnabled ? "ON — added" : "OFF"}</p>
              </div>
            </button>
          </div>

          {/* ── 4. Live Calculation Breakdown ── */}
          {form.amount && parseFloat(form.amount) > 0 && (
            <div className="rounded-xl border bg-secondary/30 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Breakdown</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(breakdown.subtotal)}</span>
                </div>
                {form.taxDeductionEnabled && (
                  <div className="flex justify-between text-amber-600">
                    <span>Income Tax ({(form.taxRate * 100).toFixed(0)}%)</span>
                    <span className="font-medium">− {formatCurrency(breakdown.incomeTax)}</span>
                  </div>
                )}
                {form.vatEnabled && (
                  <div className="flex justify-between text-blue-600">
                    <span>VAT ({(form.vatRate * 100).toFixed(0)}%)</span>
                    <span className="font-medium">+ {formatCurrency(breakdown.vatAmount)}</span>
                  </div>
                )}
                <div className="border-t pt-1.5">
                  <div className="flex justify-between">
                    <span className="font-semibold">Net Payable</span>
                    <span className={cn("text-lg font-bold", form.direction === "INBOUND" ? "text-emerald-600" : "text-rose-600")}>
                      {formatCurrency(breakdown.netPayable)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 5. Payment Method ── */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</label>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, method: f.method === m.value ? "" : m.value }))}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                    form.method === m.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── 6. Category + Project ── */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
              <Combobox
                options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
                value={form.categoryId}
                onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                placeholder="Select category"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</label>
              <Combobox
                options={projects.map((p: any) => ({ value: p.id, label: p.name }))}
                value={form.projectId}
                onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
                placeholder="Select project"
              />
            </div>
          </div>

          {/* ── 7. Date + Reference ── */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date *</label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reference #</label>
              <Input placeholder="Check #, transfer ref..." value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
            </div>
          </div>

          {/* ── 8. Description + Notes ── */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
            <Input placeholder="What is this payment for?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</label>
            <textarea
              placeholder="Any internal notes..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* ── 9. Status ── */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
            <div className="flex gap-2">
              {[
                { value: "PLANNED", label: "Planned", desc: "Scheduled for later" },
                { value: "COMPLETED", label: "Completed", desc: "Already paid" },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: s.value }))}
                  className={cn(
                    "flex-1 rounded-xl border-2 p-3 text-left transition-all",
                    form.status === s.value
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-secondary"
                  )}
                >
                  <p className={cn("text-sm font-semibold", form.status === s.value ? "text-primary" : "text-muted-foreground")}>{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── 10. Submit ── */}
          <Button
            className="w-full gap-2 py-6 text-base"
            onClick={handleCreate}
            disabled={!form.partyId || !form.amount || parseFloat(form.amount) <= 0 || creating}
          >
            {creating ? (
              <span className="animate-pulse">Creating...</span>
            ) : (
              <>
                {form.direction === "OUTBOUND" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                {form.direction === "OUTBOUND" ? "Record Payment Out" : "Record Payment In"}
                {breakdown.netPayable > 0 && ` — ${formatCurrency(breakdown.netPayable)}`}
              </>
            )}
          </Button>
        </div>
      </SlideOver>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PAYMENT DETAIL SLIDE-OVER                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={selected?.number} wide>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={selected.direction === "INBOUND" ? "success" : "destructive"}>{selected.direction === "INBOUND" ? "Income" : "Expense"}</Badge>
                <StatusBadge status={selected.status} />
                {selected.method && <Badge variant="outline" className="gap-1"><CreditCard className="h-3 w-3" />{selected.method.replace("_", " ")}</Badge>}
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(selected.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-xl bg-secondary/50 p-4 text-center">
              <p className={cn("text-3xl font-bold", selected.direction === "INBOUND" ? "text-emerald-600" : "text-rose-600")}>
                {selected.direction === "INBOUND" ? "+" : "-"}{formatCurrency(Number(selected.expectedAmount))}
              </p>
              {Number(selected.actualAmount) > 0 && Number(selected.actualAmount) !== Number(selected.expectedAmount) && (
                <p className="mt-1 text-sm text-muted-foreground">Actual: {formatCurrency(Number(selected.actualAmount))}</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Party</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm font-medium">{selected.party?.name}</p>
                </div>
              </div>
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="mt-0.5 text-sm font-medium">{selected.category?.name || "—"}</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Project</p>
                <p className="mt-0.5 text-sm font-medium">{selected.project?.name || "—"}</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Method</p>
                <p className="mt-0.5 text-sm font-medium">{selected.method?.replace("_", " ") || "—"}</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Planned Date</p>
                <p className="mt-0.5 text-sm font-medium">{new Date(selected.plannedDate).toLocaleDateString()}</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Actual Date</p>
                <p className="mt-0.5 text-sm font-medium">{selected.actualDate ? new Date(selected.actualDate).toLocaleDateString() : "—"}</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Created By</p>
                <p className="mt-0.5 text-sm font-medium">{selected.createdBy?.name}</p>
              </div>
              {selected.reference && (
                <div className="rounded-lg bg-secondary/30 p-3">
                  <p className="text-xs text-muted-foreground">Reference</p>
                  <p className="mt-0.5 text-sm font-medium">{selected.reference}</p>
                </div>
              )}
            </div>

            {selected.description && <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Description</p><p className="mt-0.5 text-sm">{selected.description}</p></div>}
            {selected.notes && <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Notes</p><p className="mt-0.5 text-sm">{selected.notes}</p></div>}

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

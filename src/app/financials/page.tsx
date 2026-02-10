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
  Landmark, PiggyBank, Scale, FileText, Edit3, Check,
} from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ───────────────────────────────────────────────────────────────────
interface PaymentForm {
  direction: string
  partyId: string
  categoryId: string
  projectId: string
  grossAmount: string      // total amount including VAT (what's on the invoice)
  vatEnabled: boolean
  vatRate: number           // e.g. 0.14
  taxDeductionEnabled: boolean
  taxRate: number           // e.g. 0.03
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
  grossAmount: "",
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

const EMPTY_SUMMARY = {
  grossRevenue: 0, grossExpenses: 0, netProfit: 0,
  vatCollected: 0, vatPaid: 0, netVatPayable: 0,
  taxDeductedByClients: 0, taxWeDeducted: 0,
  bankBalance: 0, bankIn: 0, bankOut: 0,
  plannedIn: 0, plannedOut: 0, plannedBalance: 0,
  totalPayments: 0,
}

// ─── Calculation Helper ──────────────────────────────────────────────────────
// User enters GROSS amount (total including VAT). System back-calculates.
// Example: gross=11400, vatRate=0.14 → subtotal=10000, vat=1400, tax3%=300, netBank=11100
function calcFromGross(gross: string, vatEnabled: boolean, vatRate: number, taxEnabled: boolean, taxRate: number) {
  const grossNum = parseFloat(gross) || 0
  const subtotal = vatEnabled ? Math.round((grossNum / (1 + vatRate)) * 100) / 100 : grossNum
  const vatAmount = vatEnabled ? Math.round((grossNum - subtotal) * 100) / 100 : 0
  const incomeTax = taxEnabled ? Math.round(subtotal * taxRate * 100) / 100 : 0
  const netBank = Math.round((grossNum - incomeTax) * 100) / 100
  return { grossNum, subtotal, vatAmount, incomeTax, netBank }
}

export default function FinancialsPage() {
  const { currentUser } = useUser()
  const [payments, setPayments] = useState<any[]>([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [parties, setParties] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<PaymentForm>({ ...EMPTY_FORM })
  const [dirFilter, setDirFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [form, setForm] = useState<PaymentForm>({ ...EMPTY_FORM })
  const [showNewParty, setShowNewParty] = useState(false)
  const [newPartyName, setNewPartyName] = useState("")
  const [newPartyType, setNewPartyType] = useState("VENDOR")
  const [creating, setCreating] = useState(false)
  const [dashTab, setDashTab] = useState<"overview" | "vat" | "tax" | "bank">("overview")

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
  const handlePartyChange = (partyId: string, target: "create" | "edit" = "create") => {
    const party = parties.find((p: any) => p.id === partyId)
    const setter = target === "create" ? setForm : setEditForm
    setter((prev) => ({
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
    () => calcFromGross(form.grossAmount, form.vatEnabled, form.vatRate, form.taxDeductionEnabled, form.taxRate),
    [form.grossAmount, form.vatEnabled, form.vatRate, form.taxDeductionEnabled, form.taxRate]
  )

  const editBreakdown = useMemo(
    () => calcFromGross(editForm.grossAmount, editForm.vatEnabled, editForm.vatRate, editForm.taxDeductionEnabled, editForm.taxRate),
    [editForm.grossAmount, editForm.vatEnabled, editForm.vatRate, editForm.taxDeductionEnabled, editForm.taxRate]
  )

  // ─── Create Inline Party ────────────────────────────────────────────────
  const handleCreateParty = async () => {
    if (!orgId || !newPartyName.trim()) return
    const party = await createParty({
      organizationId: orgId,
      name: newPartyName.trim(),
      type: newPartyType as any,
    })
    setParties((prev) => [...prev, party].sort((a: any, b: any) => a.name.localeCompare(b.name)))
    handlePartyChange(party.id)
    setShowNewParty(false)
    setNewPartyName("")
  }

  // ─── Create Payment ────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!orgId || !currentUser || !form.partyId || !form.grossAmount) return
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
        expectedAmount: breakdown.grossNum,
        description: form.description || undefined,
        status: form.status as any,
        method: form.method ? (form.method as any) : undefined,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
        actualDate: isCompleted ? new Date(form.date) : undefined,
        actualAmount: isCompleted ? breakdown.netBank : undefined,
        createdById: currentUser.id,
        subtotal: breakdown.subtotal,
        vatAmount: breakdown.vatAmount,
        vatRate: form.vatEnabled ? form.vatRate : 0,
        incomeTaxAmount: breakdown.incomeTax,
        incomeTaxRate: form.taxDeductionEnabled ? form.taxRate : 0,
        grossAmount: breakdown.grossNum,
        netBankAmount: breakdown.netBank,
      })
      setShowCreate(false)
      setForm({ ...EMPTY_FORM })
      load()
    } catch (err) {
      console.error("Failed to create payment:", err)
      alert("Failed to create payment. Check console for details.")
    } finally {
      setCreating(false)
    }
  }

  // ─── Update Payment ─────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!selected) return
    try {
      const b = editBreakdown
      const isCompleted = editForm.status === "COMPLETED"
      await updatePayment(selected.id, {
        direction: editForm.direction as any,
        partyId: editForm.partyId || undefined,
        categoryId: editForm.categoryId || null,
        projectId: editForm.projectId || null,
        plannedDate: new Date(editForm.date),
        expectedAmount: b.grossNum,
        status: editForm.status as any,
        method: editForm.method ? (editForm.method as any) : undefined,
        reference: editForm.reference || undefined,
        description: editForm.description || undefined,
        notes: editForm.notes || undefined,
        actualDate: isCompleted ? new Date(editForm.date) : null,
        actualAmount: isCompleted ? b.netBank : null,
        subtotal: b.subtotal,
        vatAmount: b.vatAmount,
        vatRate: editForm.vatEnabled ? editForm.vatRate : 0,
        incomeTaxAmount: b.incomeTax,
        incomeTaxRate: editForm.taxDeductionEnabled ? editForm.taxRate : 0,
        grossAmount: b.grossNum,
        netBankAmount: b.netBank,
      } as any)
      const updated = await getPaymentById(selected.id)
      setSelected(updated)
      setEditing(false)
      load()
    } catch (err) {
      console.error("Failed to update payment:", err)
      alert("Failed to update payment. Check console for details.")
    }
  }

  // ─── Detail Handlers ─────────────────────────────────────────────────────
  const handleSelect = async (id: string) => {
    const p = await getPaymentById(id)
    setSelected(p)
    setEditing(false)
  }

  const startEdit = () => {
    if (!selected) return
    setEditForm({
      direction: selected.direction,
      partyId: selected.partyId || "",
      categoryId: selected.categoryId || "",
      projectId: selected.projectId || "",
      grossAmount: String(Number(selected.grossAmount || selected.expectedAmount || 0)),
      vatEnabled: Number(selected.vatRate || 0) > 0,
      vatRate: Number(selected.vatRate || 0.14),
      taxDeductionEnabled: Number(selected.incomeTaxRate || 0) > 0,
      taxRate: Number(selected.incomeTaxRate || 0.03),
      method: selected.method || "",
      date: selected.plannedDate ? new Date(selected.plannedDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      status: selected.status,
      description: selected.description || "",
      reference: selected.reference || "",
      notes: selected.notes || "",
    })
    setEditing(true)
  }

  const handleStatusChange = async (id: string, status: string) => {
    const grossAmt = Number(selected?.grossAmount || selected?.expectedAmount || 0)
    const taxAmt = Number(selected?.incomeTaxAmount || 0)
    const netBank = grossAmt - taxAmt
    await updatePayment(id, {
      status: status as any,
      ...(status === "COMPLETED" ? { actualDate: new Date(), actualAmount: netBank } : {}),
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

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financials</h1>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Payment</Button>
      </div>

      {/* ─── Dashboard Tabs ─── */}
      <div className="flex gap-1 rounded-lg bg-secondary p-1">
        {[
          { key: "overview", label: "Overview", icon: Banknote },
          { key: "vat", label: "VAT", icon: Receipt },
          { key: "tax", label: "Tax Deductions", icon: Percent },
          { key: "bank", label: "Bank", icon: Landmark },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setDashTab(t.key as any)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
              dashTab === t.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── Dashboard Cards ─── */}
      {dashTab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gross Revenue</CardTitle>
              <div className="rounded-lg bg-emerald-50 p-1.5 dark:bg-emerald-950/40"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(summary.grossRevenue)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gross Expenses</CardTitle>
              <div className="rounded-lg bg-rose-50 p-1.5 dark:bg-rose-950/40"><TrendingDown className="h-4 w-4 text-rose-600" /></div>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(summary.grossExpenses)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
              <div className={cn("rounded-lg p-1.5", summary.netProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-rose-50 dark:bg-rose-950/40")}>
                <Banknote className={cn("h-4 w-4", summary.netProfit >= 0 ? "text-emerald-600" : "text-rose-600")} />
              </div>
            </CardHeader>
            <CardContent><p className={cn("text-2xl font-bold", summary.netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(summary.netProfit)}</p></CardContent>
          </Card>
        </div>
      )}

      {dashTab === "vat" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">VAT Collected</CardTitle>
              <div className="rounded-lg bg-blue-50 p-1.5 dark:bg-blue-950/40"><ArrowDownLeft className="h-4 w-4 text-blue-600" /></div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.vatCollected)}</p>
              <p className="mt-1 text-xs text-muted-foreground">14% collected from clients on inbound</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">VAT Paid</CardTitle>
              <div className="rounded-lg bg-indigo-50 p-1.5 dark:bg-indigo-950/40"><ArrowUpRight className="h-4 w-4 text-indigo-600" /></div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-indigo-600">{formatCurrency(summary.vatPaid)}</p>
              <p className="mt-1 text-xs text-muted-foreground">14% paid to vendors (deductible)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net VAT Payable</CardTitle>
              <div className={cn("rounded-lg p-1.5", summary.netVatPayable > 0 ? "bg-amber-50 dark:bg-amber-950/40" : "bg-emerald-50 dark:bg-emerald-950/40")}>
                <Scale className={cn("h-4 w-4", summary.netVatPayable > 0 ? "text-amber-600" : "text-emerald-600")} />
              </div>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-bold", summary.netVatPayable > 0 ? "text-amber-600" : "text-emerald-600")}>{formatCurrency(summary.netVatPayable)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{summary.netVatPayable > 0 ? "Owed to government" : "Credit / refundable"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {dashTab === "tax" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tax Deducted by Clients (3%)</CardTitle>
              <div className="rounded-lg bg-amber-50 p-1.5 dark:bg-amber-950/40"><Percent className="h-4 w-4 text-amber-600" /></div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.taxDeductedByClients)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Credit with government (withheld from your invoices)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tax We Deducted (3%)</CardTitle>
              <div className="rounded-lg bg-orange-50 p-1.5 dark:bg-orange-950/40"><FileText className="h-4 w-4 text-orange-600" /></div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.taxWeDeducted)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Withheld from vendors (we owe government)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {dashTab === "bank" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bank In</CardTitle>
              <div className="rounded-lg bg-emerald-50 p-1.5 dark:bg-emerald-950/40"><ArrowDownLeft className="h-4 w-4 text-emerald-600" /></div>
            </CardHeader>
            <CardContent><p className="text-xl font-bold text-emerald-600">{formatCurrency(summary.bankIn)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bank Out</CardTitle>
              <div className="rounded-lg bg-rose-50 p-1.5 dark:bg-rose-950/40"><ArrowUpRight className="h-4 w-4 text-rose-600" /></div>
            </CardHeader>
            <CardContent><p className="text-xl font-bold text-rose-600">{formatCurrency(summary.bankOut)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bank Balance</CardTitle>
              <div className={cn("rounded-lg p-1.5", summary.bankBalance >= 0 ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-rose-50 dark:bg-rose-950/40")}>
                <Landmark className={cn("h-4 w-4", summary.bankBalance >= 0 ? "text-emerald-600" : "text-rose-600")} />
              </div>
            </CardHeader>
            <CardContent><p className={cn("text-xl font-bold", summary.bankBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(summary.bankBalance)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Planned Balance</CardTitle>
              <div className="rounded-lg bg-violet-50 p-1.5 dark:bg-violet-950/40"><PiggyBank className="h-4 w-4 text-violet-600" /></div>
            </CardHeader>
            <CardContent>
              <p className={cn("text-xl font-bold", summary.plannedBalance >= 0 ? "text-violet-600" : "text-rose-600")}>{formatCurrency(summary.plannedBalance)}</p>
              <p className="mt-1 text-xs text-muted-foreground">+{formatCurrency(summary.plannedIn)} in / -{formatCurrency(summary.plannedOut)} out</p>
            </CardContent>
          </Card>
        </div>
      )}

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
              {filtered.map((p: any) => {
                const gross = Number(p.grossAmount) || Number(p.expectedAmount) || 0
                return (
                  <button key={p.id} className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/50" onClick={() => handleSelect(p.id)}>
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", p.direction === "INBOUND" ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-rose-50 dark:bg-rose-950/40")}>
                        {p.direction === "INBOUND" ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> : <ArrowUpRight className="h-4 w-4 text-rose-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.party?.name || "—"}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.description || p.number}{p.category ? ` · ${p.category.name}` : ""}{p.project ? ` · ${p.project.name}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className={cn("font-semibold", p.direction === "INBOUND" ? "text-emerald-600" : "text-rose-600")}>
                          {p.direction === "INBOUND" ? "+" : "-"}{formatCurrency(gross)}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(p.plannedDate).toLocaleDateString()}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CREATE PAYMENT SLIDE-OVER                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <SlideOver open={showCreate} onClose={() => { setShowCreate(false); setForm({ ...EMPTY_FORM }); setShowNewParty(false) }} title="New Payment" wide>
        {renderPaymentForm(form, setForm, breakdown, handlePartyChange, "create")}
      </SlideOver>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PAYMENT DETAIL SLIDE-OVER                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <SlideOver open={!!selected} onClose={() => { setSelected(null); setEditing(false) }} title={selected?.number} wide>
        {selected && !editing && renderPaymentDetail(selected)}
        {selected && editing && renderPaymentForm(editForm, setEditForm, editBreakdown, (id: string) => handlePartyChange(id, "edit"), "edit")}
      </SlideOver>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════
  // PAYMENT FORM (shared between create and edit)
  // ═══════════════════════════════════════════════════════════════════════
  function renderPaymentForm(
    f: PaymentForm,
    setF: React.Dispatch<React.SetStateAction<PaymentForm>>,
    bd: ReturnType<typeof calcFromGross>,
    onPartyChange: (id: string) => void,
    mode: "create" | "edit"
  ) {
    return (
      <div className="space-y-5">
        {/* 1. Direction */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Direction</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: "OUTBOUND", label: "Money Out", icon: ArrowUpRight, activeClass: "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400" },
              { val: "INBOUND", label: "Money In", icon: ArrowDownLeft, activeClass: "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" },
            ].map((d) => (
              <button key={d.val} type="button" onClick={() => setF((prev) => ({ ...prev, direction: d.val }))}
                className={cn("flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-all",
                  f.direction === d.val ? d.activeClass : "border-transparent bg-secondary text-muted-foreground hover:border-border"
                )}
              >
                <d.icon className="h-4 w-4" /> {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Party */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {f.direction === "OUTBOUND" ? "Pay To (Vendor/Party)" : "Receive From (Client/Party)"} *
          </label>
          {!showNewParty ? (
            <Combobox
              options={parties.map((p: any) => ({ value: p.id, label: p.name, sublabel: p.type }))}
              value={f.partyId}
              onValueChange={onPartyChange}
              placeholder={f.direction === "OUTBOUND" ? "Select vendor..." : "Select client..."}
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
              <Input placeholder="Party name *" value={newPartyName} onChange={(e) => setNewPartyName(e.target.value)} autoFocus />
              <div className="flex gap-1">
                {["VENDOR", "CLIENT", "EMPLOYEE", "OTHER"].map((t) => (
                  <Button key={t} variant={newPartyType === t ? "default" : "outline"} size="sm" className="flex-1 text-xs" onClick={() => setNewPartyType(t)}>{t}</Button>
                ))}
              </div>
              <Button size="sm" className="w-full" onClick={handleCreateParty} disabled={!newPartyName.trim()}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Create & Select
              </Button>
            </div>
          )}
        </div>

        {/* 3. Total Amount (Gross = subtotal + VAT) */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Amount (incl. VAT if applicable) *</label>
          <Input
            type="number"
            placeholder="0.00"
            value={f.grossAmount}
            onChange={(e) => setF((prev) => ({ ...prev, grossAmount: e.target.value }))}
            className="text-lg font-semibold"
            min="0"
            step="0.01"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">Enter the full invoice/payment total. VAT and tax will be auto-calculated below.</p>
        </div>

        {/* Tax toggles */}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setF((prev) => ({ ...prev, vatEnabled: !prev.vatEnabled }))}
            className={cn("flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all",
              f.vatEnabled ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-transparent bg-secondary"
            )}
          >
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", f.vatEnabled ? "bg-blue-100 dark:bg-blue-900" : "bg-background")}>
              <Receipt className={cn("h-4 w-4", f.vatEnabled ? "text-blue-600" : "text-muted-foreground")} />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", f.vatEnabled ? "text-blue-700 dark:text-blue-400" : "text-muted-foreground")}>VAT {(f.vatRate * 100).toFixed(0)}%</p>
              <p className="text-[10px] text-muted-foreground">{f.vatEnabled ? "Included in total" : "No VAT"}</p>
            </div>
          </button>

          <button type="button" onClick={() => setF((prev) => ({ ...prev, taxDeductionEnabled: !prev.taxDeductionEnabled }))}
            className={cn("flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all",
              f.taxDeductionEnabled ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-transparent bg-secondary"
            )}
          >
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", f.taxDeductionEnabled ? "bg-amber-100 dark:bg-amber-900" : "bg-background")}>
              <Percent className={cn("h-4 w-4", f.taxDeductionEnabled ? "text-amber-600" : "text-muted-foreground")} />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", f.taxDeductionEnabled ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>Tax {(f.taxRate * 100).toFixed(0)}%</p>
              <p className="text-[10px] text-muted-foreground">{f.taxDeductionEnabled ? "Deducted at source" : "No deduction"}</p>
            </div>
          </button>
        </div>

        {/* 4. Live Breakdown */}
        {f.grossAmount && parseFloat(f.grossAmount) > 0 && (
          <div className="rounded-xl border bg-secondary/30 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto-Calculated Breakdown</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between font-medium">
                <span>Gross (Invoice Total)</span>
                <span>{formatCurrency(bd.grossNum)}</span>
              </div>
              {f.vatEnabled && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>├ Subtotal (before VAT)</span>
                    <span>{formatCurrency(bd.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>├ VAT ({(f.vatRate * 100).toFixed(0)}%)</span>
                    <span>{formatCurrency(bd.vatAmount)}</span>
                  </div>
                </>
              )}
              {f.taxDeductionEnabled && (
                <div className="flex justify-between text-amber-600">
                  <span>└ Income Tax ({(f.taxRate * 100).toFixed(0)}%) deducted</span>
                  <span>− {formatCurrency(bd.incomeTax)}</span>
                </div>
              )}
              <div className="border-t pt-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold">Net Bank Amount</span>
                  <span className={cn("text-lg font-bold", f.direction === "INBOUND" ? "text-emerald-600" : "text-rose-600")}>
                    {formatCurrency(bd.netBank)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {f.direction === "INBOUND" ? "What you receive in your bank" : "What you actually pay"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 5. Payment Method */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Method</label>
          <div className="grid grid-cols-3 gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button key={m.value} type="button" onClick={() => setF((prev) => ({ ...prev, method: prev.method === m.value ? "" : m.value }))}
                className={cn("rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                  f.method === m.value ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >{m.label}</button>
            ))}
          </div>
        </div>

        {/* 6. Category + Project */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
            <Combobox options={categories.map((c: any) => ({ value: c.id, label: c.name }))} value={f.categoryId} onValueChange={(v) => setF((prev) => ({ ...prev, categoryId: v }))} placeholder="Select category" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</label>
            <Combobox options={projects.map((p: any) => ({ value: p.id, label: p.name }))} value={f.projectId} onValueChange={(v) => setF((prev) => ({ ...prev, projectId: v }))} placeholder="Select project" />
          </div>
        </div>

        {/* 7. Date + Reference */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date *</label>
            <Input type="date" value={f.date} onChange={(e) => setF((prev) => ({ ...prev, date: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reference #</label>
            <Input placeholder="Check #, transfer ref..." value={f.reference} onChange={(e) => setF((prev) => ({ ...prev, reference: e.target.value }))} />
          </div>
        </div>

        {/* 8. Description + Notes */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
          <Input placeholder="What is this payment for?" value={f.description} onChange={(e) => setF((prev) => ({ ...prev, description: e.target.value }))} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</label>
          <textarea placeholder="Internal notes..." value={f.notes} onChange={(e) => setF((prev) => ({ ...prev, notes: e.target.value }))} rows={2}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>

        {/* 9. Status */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
          <div className="flex gap-2">
            {[
              { value: "PLANNED", label: "Planned", desc: "Scheduled for later" },
              { value: "COMPLETED", label: "Completed", desc: "Already paid/received" },
            ].map((s) => (
              <button key={s.value} type="button" onClick={() => setF((prev) => ({ ...prev, status: s.value }))}
                className={cn("flex-1 rounded-xl border-2 p-3 text-left transition-all",
                  f.status === s.value ? "border-primary bg-primary/5" : "border-transparent bg-secondary"
                )}
              >
                <p className={cn("text-sm font-semibold", f.status === s.value ? "text-primary" : "text-muted-foreground")}>{s.label}</p>
                <p className="text-[10px] text-muted-foreground">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 10. Submit */}
        <Button
          className="w-full gap-2 py-6 text-base"
          onClick={mode === "create" ? handleCreate : handleUpdate}
          disabled={!f.partyId || !f.grossAmount || parseFloat(f.grossAmount) <= 0 || creating}
        >
          {creating ? (
            <span className="animate-pulse">Saving...</span>
          ) : mode === "create" ? (
            <>
              {f.direction === "OUTBOUND" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
              {f.direction === "OUTBOUND" ? "Record Payment Out" : "Record Payment In"}
              {bd.grossNum > 0 && ` — ${formatCurrency(bd.grossNum)}`}
            </>
          ) : (
            <><Check className="h-5 w-5" /> Save Changes</>
          )}
        </Button>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAYMENT DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════════
  function renderPaymentDetail(p: any) {
    const gross = Number(p.grossAmount) || Number(p.expectedAmount) || 0
    const sub = Number(p.subtotal) || 0
    const vat = Number(p.vatAmount) || 0
    const tax = Number(p.incomeTaxAmount) || 0
    const net = Number(p.netBankAmount) || Number(p.actualAmount) || gross
    const hasBreakdown = vat > 0 || tax > 0

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={p.direction === "INBOUND" ? "success" : "destructive"}>{p.direction === "INBOUND" ? "Income" : "Expense"}</Badge>
            <StatusBadge status={p.status} />
            {p.method && <Badge variant="outline" className="gap-1"><CreditCard className="h-3 w-3" />{p.method.replace("_", " ")}</Badge>}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={startEdit}><Edit3 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Amount Display */}
        <div className="rounded-xl bg-secondary/50 p-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Gross Amount (Invoice Total)</p>
            <p className={cn("text-3xl font-bold", p.direction === "INBOUND" ? "text-emerald-600" : "text-rose-600")}>
              {p.direction === "INBOUND" ? "+" : "-"}{formatCurrency(gross)}
            </p>
          </div>
          {hasBreakdown && (
            <div className="mt-3 space-y-1.5 border-t pt-3 text-sm">
              {sub > 0 && <div className="flex justify-between text-muted-foreground"><span>Subtotal (base)</span><span>{formatCurrency(sub)}</span></div>}
              {vat > 0 && <div className="flex justify-between text-blue-600"><span>VAT ({(Number(p.vatRate || 0) * 100).toFixed(0)}%)</span><span>{formatCurrency(vat)}</span></div>}
              {tax > 0 && <div className="flex justify-between text-amber-600"><span>Tax ({(Number(p.incomeTaxRate || 0) * 100).toFixed(0)}%) deducted</span><span>−{formatCurrency(tax)}</span></div>}
              <div className="flex justify-between font-semibold border-t pt-1.5"><span>Net Bank</span><span>{formatCurrency(net)}</span></div>
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-secondary/30 p-3">
            <p className="text-xs text-muted-foreground">Party</p>
            <div className="mt-0.5 flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /><p className="text-sm font-medium">{p.party?.name || "—"}</p></div>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Category</p><p className="mt-0.5 text-sm font-medium">{p.category?.name || "—"}</p></div>
          <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Project</p><p className="mt-0.5 text-sm font-medium">{p.project?.name || "—"}</p></div>
          <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Method</p><p className="mt-0.5 text-sm font-medium">{p.method?.replace("_", " ") || "—"}</p></div>
          <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Planned Date</p><p className="mt-0.5 text-sm font-medium">{new Date(p.plannedDate).toLocaleDateString()}</p></div>
          <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Actual Date</p><p className="mt-0.5 text-sm font-medium">{p.actualDate ? new Date(p.actualDate).toLocaleDateString() : "—"}</p></div>
          <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Created By</p><p className="mt-0.5 text-sm font-medium">{p.createdBy?.name}</p></div>
          {p.reference && <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Reference</p><p className="mt-0.5 text-sm font-medium">{p.reference}</p></div>}
        </div>

        {p.description && <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Description</p><p className="mt-0.5 text-sm">{p.description}</p></div>}
        {p.notes && <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Notes</p><p className="mt-0.5 text-sm">{p.notes}</p></div>}

        {/* Status Actions */}
        <div>
          <h3 className="mb-2 font-semibold">Update Status</h3>
          <div className="flex flex-wrap gap-1">
            {["PLANNED", "PENDING", "COMPLETED", "PARTIAL", "CANCELLED"].map((s) => (
              <Button key={s} variant={p.status === s ? "default" : "outline"} size="sm" className="text-xs" onClick={() => handleStatusChange(p.id, s)}>{s}</Button>
            ))}
          </div>
        </div>

        {p.allocations?.length > 0 && (
          <div>
            <h3 className="mb-2 font-semibold">Linked Documents</h3>
            <div className="divide-y rounded-lg border">
              {p.allocations.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{a.document?.number} ({a.document?.type})</span>
                  <span className="font-medium">{formatCurrency(Number(a.amount))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
}

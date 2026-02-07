"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/badge"
import { Combobox } from "@/components/ui/combobox"
import { SlideOver } from "@/components/ui/slide-over"
import { getPayments, getFinancialSummary, getCategories, createPayment, getNextPaymentNumber } from "@/lib/actions/financial-actions"
import { getParties } from "@/lib/actions/party-actions"
import { formatCurrency } from "@/lib/utils"
import { Plus, TrendingUp, TrendingDown, Banknote, ArrowUpRight, ArrowDownLeft } from "lucide-react"

export default function FinancialsPage() {
  const { currentUser } = useUser()
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [payments, setPayments] = useState<any[]>([])
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, netProfit: 0 })
  const [parties, setParties] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ direction: "OUTBOUND", partyId: "", categoryId: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] })

  const orgId = currentUser?.organizationId
  const load = useCallback(async () => {
    if (!orgId) return
    const [p, s, pts, cats] = await Promise.all([
      getPayments(orgId),
      getFinancialSummary(orgId),
      getParties(orgId),
      getCategories(orgId),
    ])
    setPayments(p); setSummary(s); setParties(pts); setCategories(cats)
  }, [orgId])
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
      plannedDate: new Date(form.date),
      expectedAmount: parseFloat(form.amount),
      description: form.description,
      createdById: currentUser.id,
    })
    setShowCreate(false)
    setForm({ direction: "OUTBOUND", partyId: "", categoryId: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] })
    load()
  }

  const stats = [
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
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <div className={`rounded-lg p-1.5 ${s.bg}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{s.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Payments ({payments.length})</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No payments yet. Create your first payment or ask AI to create one.</p>
          ) : (
            <div className="divide-y">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-1.5 ${p.direction === "INBOUND" ? "bg-emerald-50" : "bg-rose-50"}`}>
                      {p.direction === "INBOUND" ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> : <ArrowUpRight className="h-4 w-4 text-rose-600" />}
                    </div>
                    <div>
                      <p className="font-medium">{p.party?.name}</p>
                      <p className="text-xs text-muted-foreground">{p.number} · {p.description || "No description"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className={`font-semibold ${p.direction === "INBOUND" ? "text-emerald-600" : "text-rose-600"}`}>
                        {p.direction === "INBOUND" ? "+" : "-"}{formatCurrency(Number(p.expectedAmount))}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(p.plannedDate).toLocaleDateString()}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="New Payment">
        <div className="space-y-4">
          <div className="flex gap-2">
            {["OUTBOUND", "INBOUND"].map((d) => (
              <Button key={d} variant={form.direction === d ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, direction: d })} className="flex-1">
                {d === "INBOUND" ? "Money In" : "Money Out"}
              </Button>
            ))}
          </div>
          <Combobox
            options={parties.map((p: any) => ({ value: p.id, label: p.name, sublabel: p.type }))}
            value={form.partyId}
            onValueChange={(v) => setForm({ ...form, partyId: v })}
            placeholder="Select party..."
            searchPlaceholder="Search vendors, clients..."
          />
          <Combobox
            options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
            value={form.categoryId}
            onValueChange={(v) => setForm({ ...form, categoryId: v })}
            placeholder="Category (optional)"
          />
          <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button className="w-full" onClick={handleCreate} disabled={!form.partyId || !form.amount}>Create Payment</Button>
        </div>
      </SlideOver>
    </div>
  )
}

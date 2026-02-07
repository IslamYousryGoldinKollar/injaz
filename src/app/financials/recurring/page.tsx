"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SlideOver } from "@/components/ui/slide-over"
import { getRecurringExpenses, createRecurringExpense, updateRecurringExpense, deleteRecurringExpense } from "@/lib/actions/recurring-actions"
import { formatCurrency } from "@/lib/utils"
import { Plus, Trash2, RefreshCw, Calendar, Power, PowerOff } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
const freqLabels: Record<string, string> = { WEEKLY: "Weekly", MONTHLY: "Monthly", QUARTERLY: "Quarterly", YEARLY: "Yearly" }

export default function RecurringExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [showActive, setShowActive] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({
    name: "", vendorName: "", category: "", amount: "", frequency: "MONTHLY",
    startDate: new Date().toISOString().split("T")[0], endDate: "", nextDueDate: new Date().toISOString().split("T")[0],
  })

  const load = useCallback(async () => {
    const e = await getRecurringExpenses({ isActive: showActive })
    setExpenses(e)
  }, [showActive])
  useEffect(() => { void load() }, [load])

  const totalMonthly = expenses.reduce((s, e) => {
    const amt = Number(e.amount)
    if (e.frequency === "WEEKLY") return s + amt * 4.33
    if (e.frequency === "MONTHLY") return s + amt
    if (e.frequency === "QUARTERLY") return s + amt / 3
    if (e.frequency === "YEARLY") return s + amt / 12
    return s
  }, 0)

  const handleCreate = async () => {
    if (!form.name || !form.amount) return
    await createRecurringExpense({
      name: form.name, vendorName: form.vendorName, category: form.category,
      amount: parseFloat(form.amount), frequency: form.frequency,
      startDate: new Date(form.startDate),
      endDate: form.endDate ? new Date(form.endDate) : undefined,
      nextDueDate: new Date(form.nextDueDate),
    })
    setShowCreate(false)
    setForm({ name: "", vendorName: "", category: "", amount: "", frequency: "MONTHLY", startDate: new Date().toISOString().split("T")[0], endDate: "", nextDueDate: new Date().toISOString().split("T")[0] })
    load()
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    await updateRecurringExpense(id, { isActive: !isActive })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recurring expense?")) return
    await deleteRecurringExpense(id)
    setSelected(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recurring Expenses</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Recurring</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Monthly Burn Rate</p>
            <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalMonthly)}</p>
            <p className="text-xs text-muted-foreground">{expenses.length} active recurring expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Annual Projection</p>
            <p className="text-2xl font-bold">{formatCurrency(totalMonthly * 12)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1">
        <Button variant={showActive ? "default" : "ghost"} size="sm" onClick={() => setShowActive(true)}>Active</Button>
        <Button variant={!showActive ? "default" : "ghost"} size="sm" onClick={() => setShowActive(false)}>Inactive</Button>
      </div>

      {expenses.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <RefreshCw className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No {showActive ? "active" : "inactive"} recurring expenses.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((e: any) => (
            <Card key={e.id} className="group">
              <CardContent className="flex items-center justify-between p-4">
                <button className="flex items-center gap-3 text-left flex-1 min-w-0" onClick={() => setSelected(e)}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50">
                    <RefreshCw className="h-4 w-4 text-rose-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{e.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{e.vendorName}</span>
                      <span>·</span>
                      <span>{freqLabels[e.frequency] || e.frequency}</span>
                      {e.category && <><span>·</span><span>{e.category}</span></>}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-semibold text-rose-600">{formatCurrency(Number(e.amount))}</p>
                    <p className="text-xs text-muted-foreground">
                      <Calendar className="inline h-3 w-3" /> {new Date(e.nextDueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => toggleActive(e.id, e.isActive)}>
                    {e.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="New Recurring Expense">
        <div className="space-y-4">
          <Input placeholder="Expense name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Vendor name" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
          <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-xs font-medium">Amount</label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" /></div>
            <div>
              <label className="mb-1 block text-xs font-medium">Frequency</label>
              <div className="flex gap-1">
                {["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"].map((f) => (
                  <Button key={f} variant={form.frequency === f ? "default" : "outline"} size="sm" className="flex-1 text-[10px] px-1" onClick={() => setForm({ ...form, frequency: f })}>
                    {f.slice(0, 3)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-xs font-medium">Start Date</label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-medium">Next Due</label><Input type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} /></div>
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={!form.name || !form.amount}>Create Recurring Expense</Button>
        </div>
      </SlideOver>

      {/* Detail */}
      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Badge variant={selected.isActive ? "success" : "secondary"}>{selected.isActive ? "Active" : "Inactive"}</Badge>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(selected.id)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Vendor</p><p className="text-sm font-medium">{selected.vendorName}</p></div>
              <div><p className="text-xs text-muted-foreground">Category</p><p className="text-sm">{selected.category || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Amount</p><p className="text-sm font-bold text-rose-600">{formatCurrency(Number(selected.amount))}</p></div>
              <div><p className="text-xs text-muted-foreground">Frequency</p><p className="text-sm">{freqLabels[selected.frequency] || selected.frequency}</p></div>
              <div><p className="text-xs text-muted-foreground">Start Date</p><p className="text-sm">{new Date(selected.startDate).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Next Due</p><p className="text-sm font-medium">{new Date(selected.nextDueDate).toLocaleDateString()}</p></div>
              {selected.endDate && <div><p className="text-xs text-muted-foreground">End Date</p><p className="text-sm">{new Date(selected.endDate).toLocaleDateString()}</p></div>}
            </div>
            <Button variant="outline" className="w-full" onClick={() => { toggleActive(selected.id, selected.isActive); setSelected(null) }}>
              {selected.isActive ? <><PowerOff className="h-4 w-4" /> Deactivate</> : <><Power className="h-4 w-4" /> Activate</>}
            </Button>
          </div>
        )}
      </SlideOver>
    </div>
  )
}

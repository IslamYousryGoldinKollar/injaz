"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SlideOver } from "@/components/ui/slide-over"
import { getVatLiabilities, createVatLiability, updateVatLiability, deleteVatLiability } from "@/lib/actions/vat-actions"
import { formatCurrency } from "@/lib/utils"
import { Plus, Trash2, Receipt, Clock, CheckCircle2, AlertTriangle } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
const statusColors: Record<string, string> = { PENDING: "warning", PAID: "success", OVERDUE: "destructive" }
const statusIcons: Record<string, any> = { PENDING: Clock, PAID: CheckCircle2, OVERDUE: AlertTriangle }

export default function VatPage() {
  const [liabilities, setLiabilities] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({
    month: "", collectedVat: "", deductibleVat: "", dueDate: "",
  })

  const load = useCallback(async () => {
    const filters: any = {}
    if (statusFilter) filters.status = statusFilter
    const l = await getVatLiabilities(filters)
    setLiabilities(l)
  }, [statusFilter])
  useEffect(() => { void load() }, [load])

  const totalPending = liabilities.filter(l => l.status !== "PAID").reduce((s, l) => s + Number(l.netVatPayable), 0)
  const totalPaid = liabilities.filter(l => l.status === "PAID").reduce((s, l) => s + Number(l.netVatPayable), 0)

  const collected = parseFloat(form.collectedVat || "0")
  const deductible = parseFloat(form.deductibleVat || "0")
  const netPayable = collected - deductible

  const handleCreate = async () => {
    if (!form.month || !form.dueDate) return
    await createVatLiability({
      month: form.month,
      collectedVat: collected,
      deductibleVat: deductible,
      netVatPayable: netPayable,
      dueDate: new Date(form.dueDate),
    })
    setShowCreate(false)
    setForm({ month: "", collectedVat: "", deductibleVat: "", dueDate: "" })
    load()
  }

  const handleStatusChange = async (id: string, status: string) => {
    const data: any = { status }
    if (status === "PAID") data.paidDate = new Date()
    else data.paidDate = null
    await updateVatLiability(id, data)
    if (selected?.id === id) setSelected({ ...selected, status })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this VAT record?")) return
    await deleteVatLiability(id)
    setSelected(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">VAT Liability</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Period</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending VAT</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-muted-foreground">{liabilities.filter(l => l.status !== "PAID").length} periods outstanding</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Paid VAT</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1">
        {["", "PENDING", "PAID", "OVERDUE"].map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "ghost"} size="sm" onClick={() => setStatusFilter(s)}>
            {s || "All"}
          </Button>
        ))}
      </div>

      {liabilities.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Receipt className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No VAT periods recorded.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {liabilities.map((l: any) => {
            const Icon = statusIcons[l.status] || Clock
            const isOverdue = l.status !== "PAID" && new Date(l.dueDate) < new Date()
            return (
              <Card key={l.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setSelected(l)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${l.status === "PAID" ? "text-emerald-600" : isOverdue ? "text-rose-600" : "text-amber-600"}`} />
                    <div>
                      <p className="font-medium">{l.month}</p>
                      <p className="text-xs text-muted-foreground">Due {new Date(l.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(Number(l.netVatPayable))}</p>
                    <Badge variant={(isOverdue && l.status !== "PAID" ? "destructive" : statusColors[l.status]) as any} className="text-xs">
                      {isOverdue && l.status !== "PAID" ? "OVERDUE" : l.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="New VAT Period">
        <div className="space-y-4">
          <div><label className="mb-1 block text-xs font-medium">Period (Month)</label><Input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-xs font-medium">Collected VAT</label><Input type="number" value={form.collectedVat} onChange={(e) => setForm({ ...form, collectedVat: e.target.value })} placeholder="0" /></div>
            <div><label className="mb-1 block text-xs font-medium">Deductible VAT</label><Input type="number" value={form.deductibleVat} onChange={(e) => setForm({ ...form, deductibleVat: e.target.value })} placeholder="0" /></div>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-sm">
            <div className="flex justify-between"><span>Collected (Output VAT)</span><span>{formatCurrency(collected)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Deductible (Input VAT)</span><span>-{formatCurrency(deductible)}</span></div>
            <div className="mt-1 flex justify-between border-t pt-1 font-bold"><span>Net VAT Payable</span><span className={netPayable >= 0 ? "text-amber-600" : "text-emerald-600"}>{formatCurrency(netPayable)}</span></div>
          </div>
          <div><label className="mb-1 block text-xs font-medium">Due Date</label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          <Button className="w-full" onClick={handleCreate} disabled={!form.month || !form.dueDate}>Create VAT Period</Button>
        </div>
      </SlideOver>

      {/* Detail */}
      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={`VAT — ${selected?.month}`}>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Badge variant={statusColors[selected.status] as any}>{selected.status}</Badge>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(selected.id)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
            <div className="rounded-lg bg-secondary/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Collected VAT</span><span className="font-medium">{formatCurrency(Number(selected.collectedVat))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Deductible VAT</span><span className="font-medium">-{formatCurrency(Number(selected.deductibleVat))}</span></div>
              <div className="flex justify-between border-t pt-2 font-bold"><span>Net Payable</span><span>{formatCurrency(Number(selected.netVatPayable))}</span></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Due Date</p><p className="text-sm font-medium">{new Date(selected.dueDate).toLocaleDateString()}</p></div>
              {selected.paidDate && <div><p className="text-xs text-muted-foreground">Paid Date</p><p className="text-sm text-emerald-600">{new Date(selected.paidDate).toLocaleDateString()}</p></div>}
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Update Status</h3>
              <div className="flex flex-wrap gap-1">
                {["PENDING", "PAID", "OVERDUE"].map((s) => (
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

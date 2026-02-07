"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Combobox } from "@/components/ui/combobox"
import { SlideOver } from "@/components/ui/slide-over"
import { getDocuments, createDocument, getDocumentById, updateDocumentStatus, deleteDocument, getDocumentStats } from "@/lib/actions/document-actions"
import { getParties } from "@/lib/actions/party-actions"
import { getProjects } from "@/lib/actions/project-actions"
import { formatCurrency } from "@/lib/utils"
import { Plus, FileText, Trash2, X } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
const docTypes = [
  { value: "", label: "All" },
  { value: "QUOTATION", label: "Quotations" },
  { value: "INVOICE", label: "Invoices" },
  { value: "PURCHASE_ORDER", label: "Purchase Orders" },
  { value: "VENDOR_BILL", label: "Vendor Bills" },
]

const statusColors: Record<string, string> = {
  DRAFT: "bg-secondary text-secondary-foreground",
  SENT: "bg-blue-50 text-blue-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-rose-50 text-rose-700",
  CANCELLED: "bg-secondary text-muted-foreground line-through",
}

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
}

export default function DocumentsPage() {
  const { currentUser } = useUser()
  const [documents, setDocuments] = useState<any[]>([])
  const [stats, setStats] = useState({ quotations: 0, invoices: 0, purchaseOrders: 0, vendorBills: 0, total: 0 })
  const [parties, setParties] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [typeFilter, setTypeFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({
    type: "QUOTATION", partyId: "", projectId: "", issueDate: new Date().toISOString().split("T")[0],
    dueDate: "", notes: "", vatRate: "0.14", incomeTaxRate: "0",
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }])

  const orgId = currentUser?.organizationId
  const load = useCallback(async () => {
    if (!orgId) return
    const [d, s, pts, prj] = await Promise.all([
      getDocuments(orgId, typeFilter || undefined),
      getDocumentStats(orgId),
      getParties(orgId),
      getProjects(orgId),
    ])
    setDocuments(d); setStats(s); setParties(pts); setProjects(prj)
  }, [orgId, typeFilter])
  useEffect(() => { void load() }, [load])

  const addLine = () => setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }])
  const removeLine = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[i] = { ...updated[i], [field]: value }
    setLineItems(updated)
  }

  const subtotal = lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const vatAmount = subtotal * parseFloat(form.vatRate || "0")
  const taxAmount = subtotal * parseFloat(form.incomeTaxRate || "0")
  const total = subtotal + vatAmount - taxAmount

  const handleCreate = async () => {
    if (!orgId || !currentUser || !form.partyId || lineItems.length === 0) return
    const direction = ["QUOTATION", "INVOICE"].includes(form.type) ? "INBOUND" : "OUTBOUND"
    await createDocument({
      organizationId: orgId,
      type: form.type,
      direction,
      partyId: form.partyId,
      projectId: form.projectId || undefined,
      issueDate: new Date(form.issueDate),
      dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
      createdById: currentUser.id,
      notes: form.notes || undefined,
      lineItems: lineItems.filter((l) => l.description && l.unitPrice > 0),
      vatRate: parseFloat(form.vatRate || "0"),
      incomeTaxRate: parseFloat(form.incomeTaxRate || "0"),
    })
    setShowCreate(false)
    setForm({ type: "QUOTATION", partyId: "", projectId: "", issueDate: new Date().toISOString().split("T")[0], dueDate: "", notes: "", vatRate: "0.14", incomeTaxRate: "0" })
    setLineItems([{ description: "", quantity: 1, unitPrice: 0 }])
    load()
  }

  const handleSelect = async (id: string) => {
    const d = await getDocumentById(id)
    setSelected(d)
  }

  const handleStatusChange = async (id: string, status: string) => {
    await updateDocumentStatus(id, status)
    if (selected?.id === id) {
      const d = await getDocumentById(id)
      setSelected(d)
    }
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return
    await deleteDocument(id)
    setSelected(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Document</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Quotations", count: stats.quotations },
          { label: "Invoices", count: stats.invoices },
          { label: "Purchase Orders", count: stats.purchaseOrders },
          { label: "Vendor Bills", count: stats.vendorBills },
        ].map((s) => (
          <Card key={s.label} className="cursor-pointer hover:shadow-sm" onClick={() => setTypeFilter(s.label === "Purchase Orders" ? "PURCHASE_ORDER" : s.label === "Vendor Bills" ? "VENDOR_BILL" : s.label.toUpperCase().slice(0, -1))}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-1">
        {docTypes.map((t) => (
          <Button key={t.value} variant={typeFilter === t.value ? "default" : "ghost"} size="sm" onClick={() => setTypeFilter(t.value)}>
            {t.label}
          </Button>
        ))}
      </div>

      {documents.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No documents yet. Create a quotation or invoice.</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y">
            {documents.map((d: any) => (
              <button key={d.id} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors" onClick={() => handleSelect(d.id)}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{d.number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[d.status] || ""}`}>{d.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{d.party?.name} · {new Date(d.issueDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(Number(d.netAmount))}</p>
                  <Badge variant={d.direction === "INBOUND" ? "success" : "warning"} className="text-xs">{d.type.replace("_", " ")}</Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Create Document */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="New Document" wide>
        <div className="space-y-4">
          <div className="flex gap-2">
            {["QUOTATION", "INVOICE", "PURCHASE_ORDER", "VENDOR_BILL"].map((t) => (
              <Button key={t} variant={form.type === t ? "default" : "outline"} size="sm" className="flex-1 text-xs" onClick={() => setForm({ ...form, type: t })}>
                {t.replace("_", " ")}
              </Button>
            ))}
          </div>
          <Combobox options={parties.map((p: any) => ({ value: p.id, label: `${p.name} (${p.type})` }))} value={form.partyId} onValueChange={(v) => setForm({ ...form, partyId: v })} placeholder="Select party *" />
          <Combobox options={projects.map((p: any) => ({ value: p.id, label: p.name }))} value={form.projectId} onValueChange={(v) => setForm({ ...form, projectId: v })} placeholder="Project (optional)" />
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-xs font-medium">Issue Date</label><Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-medium">Due Date</label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Line Items</label>
              <Button variant="ghost" size="sm" onClick={addLine}><Plus className="h-3 w-3" /> Add</Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input placeholder="Description" value={item.description} onChange={(e) => updateLine(i, "description", e.target.value)} className="flex-1" />
                  <Input type="number" placeholder="Qty" value={item.quantity || ""} onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 0)} className="w-16" />
                  <Input type="number" placeholder="Price" value={item.unitPrice || ""} onChange={(e) => updateLine(i, "unitPrice", parseFloat(e.target.value) || 0)} className="w-24" />
                  <span className="flex h-9 w-20 items-center justify-end text-xs font-medium">{formatCurrency(item.quantity * item.unitPrice)}</span>
                  {lineItems.length > 1 && <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeLine(i)}><X className="h-3 w-3" /></Button>}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-xs font-medium">VAT Rate</label><Input type="number" step="0.01" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} /></div>
            <div><label className="mb-1 block text-xs font-medium">Income Tax Rate</label><Input type="number" step="0.01" value={form.incomeTaxRate} onChange={(e) => setForm({ ...form, incomeTaxRate: e.target.value })} /></div>
          </div>

          <div className="rounded-lg bg-secondary/50 p-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {vatAmount > 0 && <div className="flex justify-between text-muted-foreground"><span>VAT ({(parseFloat(form.vatRate) * 100).toFixed(0)}%)</span><span>+{formatCurrency(vatAmount)}</span></div>}
            {taxAmount > 0 && <div className="flex justify-between text-muted-foreground"><span>Income Tax ({(parseFloat(form.incomeTaxRate) * 100).toFixed(0)}%)</span><span>-{formatCurrency(taxAmount)}</span></div>}
            <div className="mt-1 flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>

          <textarea className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button className="w-full" onClick={handleCreate} disabled={!form.partyId || lineItems.every((l) => !l.description)}>Create Document</Button>
        </div>
      </SlideOver>

      {/* Document Detail */}
      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={selected?.number} wide>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[selected.status] || ""}`}>{selected.status}</span>
                <Badge variant={selected.direction === "INBOUND" ? "success" : "warning"} className="text-xs">{selected.type.replace("_", " ")}</Badge>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(selected.id)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Party</p><p className="text-sm font-medium">{selected.party?.name}</p></div>
              <div><p className="text-xs text-muted-foreground">Project</p><p className="text-sm">{selected.project?.name || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Issue Date</p><p className="text-sm">{new Date(selected.issueDate).toLocaleDateString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Due Date</p><p className="text-sm">{selected.dueDate ? new Date(selected.dueDate).toLocaleDateString() : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Created By</p><p className="text-sm">{selected.createdBy?.name}</p></div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Line Items</h3>
              <div className="rounded-lg border">
                <div className="grid grid-cols-[1fr_60px_80px_80px] gap-2 border-b bg-secondary/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <span>Description</span><span className="text-right">Qty</span><span className="text-right">Price</span><span className="text-right">Total</span>
                </div>
                {selected.lineItems?.map((item: any) => (
                  <div key={item.id} className="grid grid-cols-[1fr_60px_80px_80px] gap-2 border-b px-3 py-2 text-sm last:border-0">
                    <span>{item.description}</span>
                    <span className="text-right">{Number(item.quantity)}</span>
                    <span className="text-right">{formatCurrency(Number(item.unitPrice))}</span>
                    <span className="text-right font-medium">{formatCurrency(Number(item.total))}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-secondary/50 p-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(Number(selected.subtotal))}</span></div>
              {Number(selected.vatAmount) > 0 && <div className="flex justify-between text-muted-foreground"><span>VAT</span><span>+{formatCurrency(Number(selected.vatAmount))}</span></div>}
              {Number(selected.incomeTaxAmount) > 0 && <div className="flex justify-between text-muted-foreground"><span>Income Tax</span><span>-{formatCurrency(Number(selected.incomeTaxAmount))}</span></div>}
              <div className="mt-1 flex justify-between border-t pt-1 font-bold"><span>Net Amount</span><span>{formatCurrency(Number(selected.netAmount))}</span></div>
              {Number(selected.paidAmount) > 0 && <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{formatCurrency(Number(selected.paidAmount))}</span></div>}
              <div className="flex justify-between font-semibold"><span>Remaining</span><span>{formatCurrency(Number(selected.remainingAmount))}</span></div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Update Status</h3>
              <div className="flex flex-wrap gap-1">
                {["DRAFT", "SENT", "APPROVED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].map((s) => (
                  <Button key={s} variant={selected.status === s ? "default" : "outline"} size="sm" className="text-xs" onClick={() => handleStatusChange(selected.id, s)}>
                    {s.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>

            {selected.notes && <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{selected.notes}</p></div>}
          </div>
        )}
      </SlideOver>
    </div>
  )
}

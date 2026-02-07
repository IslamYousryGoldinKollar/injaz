"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SlideOver } from "@/components/ui/slide-over"
import { getParties, createParty, getPartyById, updateParty, deleteParty, getPartyStats, getPartyBalance } from "@/lib/actions/party-actions"
import { formatCurrency, cn } from "@/lib/utils"
import { Plus, Building2, Users, Briefcase, Search, Phone, Mail, Trash2, Pencil, Save, ArrowDownLeft, ArrowUpRight, Receipt, Percent } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
const partyTypes = [
  { value: "", label: "All", icon: Building2 },
  { value: "CLIENT", label: "Clients", icon: Briefcase },
  { value: "VENDOR", label: "Vendors", icon: Building2 },
  { value: "EMPLOYEE", label: "Employees", icon: Users },
]

export default function PartiesPage() {
  const { currentUser } = useUser()
  const [parties, setParties] = useState<any[]>([])
  const [stats, setStats] = useState({ clients: 0, vendors: 0, employees: 0, total: 0 })
  const [filter, setFilter] = useState("")
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({ type: "VENDOR", name: "", email: "", phone: "", contactName: "", address: "", notes: "", hasVat: true, vatRate: "14", hasIncomeTaxDeduction: false, incomeTaxRate: "3" })
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", contactName: "", address: "", notes: "", hasVat: true, vatRate: "14", hasIncomeTaxDeduction: false, incomeTaxRate: "3" })
  const [balance, setBalance] = useState<any>(null)

  const orgId = currentUser?.organizationId
  const load = useCallback(async () => {
    if (!orgId) return
    const [p, s] = await Promise.all([
      getParties(orgId, filter ? filter as any : undefined),
      getPartyStats(orgId),
    ])
    setParties(p); setStats(s)
  }, [orgId, filter])
  useEffect(() => { void load() }, [load])

  const handleCreate = async () => {
    if (!orgId || !form.name) return
    await createParty({
      organizationId: orgId, type: form.type as any, name: form.name,
      email: form.email || undefined, phone: form.phone || undefined,
      contactName: form.contactName || undefined, address: form.address || undefined,
      notes: form.notes || undefined,
      hasVat: form.hasVat, vatRate: parseFloat(form.vatRate) / 100 || 0.14,
      hasIncomeTaxDeduction: form.hasIncomeTaxDeduction, incomeTaxRate: parseFloat(form.incomeTaxRate) / 100 || 0.03,
    })
    setShowCreate(false)
    setForm({ type: "VENDOR", name: "", email: "", phone: "", contactName: "", address: "", notes: "", hasVat: true, vatRate: "14", hasIncomeTaxDeduction: false, incomeTaxRate: "3" })
    load()
  }

  const handleSelect = async (id: string) => {
    const [p, bal] = await Promise.all([getPartyById(id), getPartyBalance(id)])
    setSelected(p)
    setBalance(bal)
    setEditing(false)
    if (p) {
      setEditForm({
        name: p.name, email: p.email || "", phone: p.phone || "",
        contactName: p.contactName || "", address: p.address || "", notes: p.notes || "",
        hasVat: p.hasVat, vatRate: String(Number(p.vatRate) * 100),
        hasIncomeTaxDeduction: p.hasIncomeTaxDeduction, incomeTaxRate: String(Number(p.incomeTaxRate) * 100),
      })
    }
  }

  const handleSave = async () => {
    if (!selected) return
    await updateParty(selected.id, {
      name: editForm.name || undefined,
      email: editForm.email || undefined,
      phone: editForm.phone || undefined,
      contactName: editForm.contactName || undefined,
      address: editForm.address || undefined,
      notes: editForm.notes || undefined,
      hasVat: editForm.hasVat,
      vatRate: parseFloat(editForm.vatRate) / 100 || 0.14,
      hasIncomeTaxDeduction: editForm.hasIncomeTaxDeduction,
      incomeTaxRate: parseFloat(editForm.incomeTaxRate) / 100 || 0.03,
    })
    const updated = await getPartyById(selected.id)
    setSelected(updated)
    setEditing(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this party?")) return
    await deleteParty(id)
    setSelected(null)
    load()
  }

  const filtered = parties.filter((p: any) => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Parties</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Add Party</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total", count: stats.total, color: "text-foreground" },
          { label: "Clients", count: stats.clients, color: "text-blue-600" },
          { label: "Vendors", count: stats.vendors, color: "text-amber-600" },
          { label: "Employees", count: stats.employees, color: "text-violet-600" },
        ].map((s) => (
          <Card key={s.label} className="cursor-pointer hover:shadow-sm" onClick={() => setFilter(s.label === "Total" ? "" : s.label.toUpperCase().slice(0, -1))}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search parties..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {partyTypes.map((t) => (
            <Button key={t.value} variant={filter === t.value ? "default" : "ghost"} size="sm" onClick={() => setFilter(t.value)}>
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No parties found. Add your first vendor or client.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((p: any) => (
                <button key={p.id} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors" onClick={() => handleSelect(p.id)}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                        {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <Badge variant={p.type === "CLIENT" ? "info" : p.type === "VENDOR" ? "warning" : "secondary"}>
                    {p.type}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Party */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="New Party">
        <div className="space-y-4">
          <div className="flex gap-2">
            {["VENDOR", "CLIENT", "EMPLOYEE"].map((t) => (
              <Button key={t} variant={form.type === t ? "default" : "outline"} size="sm" onClick={() => setForm({ ...form, type: t })} className="flex-1">
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
          <Input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Contact Person" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <textarea className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          {/* VAT & Tax Settings */}
          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Tax Settings</p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setForm({ ...form, hasVat: !form.hasVat })}
                className={cn("flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-all flex-1",
                  form.hasVat ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-transparent bg-secondary"
                )}>
                <Receipt className={cn("h-4 w-4", form.hasVat ? "text-blue-600" : "text-muted-foreground")} />
                VAT {form.hasVat ? "ON" : "OFF"}
              </button>
              {form.hasVat && <Input className="w-20" type="number" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} placeholder="%" />}
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setForm({ ...form, hasIncomeTaxDeduction: !form.hasIncomeTaxDeduction })}
                className={cn("flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-all flex-1",
                  form.hasIncomeTaxDeduction ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-transparent bg-secondary"
                )}>
                <Percent className={cn("h-4 w-4", form.hasIncomeTaxDeduction ? "text-amber-600" : "text-muted-foreground")} />
                Tax Deduction {form.hasIncomeTaxDeduction ? "ON" : "OFF"}
              </button>
              {form.hasIncomeTaxDeduction && <Input className="w-20" type="number" value={form.incomeTaxRate} onChange={(e) => setForm({ ...form, incomeTaxRate: e.target.value })} placeholder="%" />}
            </div>
          </div>

          <Button className="w-full" onClick={handleCreate} disabled={!form.name}>Create Party</Button>
        </div>
      </SlideOver>

      {/* Party Detail */}
      <SlideOver open={!!selected} onClose={() => { setSelected(null); setEditing(false) }} title={selected?.name} wide>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Badge variant={selected.type === "CLIENT" ? "info" : selected.type === "VENDOR" ? "warning" : "secondary"}>
                {selected.type}
              </Badge>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                  {editing ? "Cancel" : <><Pencil className="h-3 w-3" /> Edit</>}
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(selected.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <Input placeholder="Name *" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                <Input placeholder="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                <Input placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                <Input placeholder="Contact Person" value={editForm.contactName} onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })} />
                <Input placeholder="Address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                <textarea className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Notes" rows={3} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                <div className="rounded-lg border p-3 space-y-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Tax Settings</p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setEditForm({ ...editForm, hasVat: !editForm.hasVat })}
                      className={cn("flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-all flex-1",
                        editForm.hasVat ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-transparent bg-secondary"
                      )}>
                      <Receipt className={cn("h-4 w-4", editForm.hasVat ? "text-blue-600" : "text-muted-foreground")} />
                      VAT {editForm.hasVat ? "ON" : "OFF"}
                    </button>
                    {editForm.hasVat && <Input className="w-20" type="number" value={editForm.vatRate} onChange={(e) => setEditForm({ ...editForm, vatRate: e.target.value })} />}
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setEditForm({ ...editForm, hasIncomeTaxDeduction: !editForm.hasIncomeTaxDeduction })}
                      className={cn("flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-all flex-1",
                        editForm.hasIncomeTaxDeduction ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : "border-transparent bg-secondary"
                      )}>
                      <Percent className={cn("h-4 w-4", editForm.hasIncomeTaxDeduction ? "text-amber-600" : "text-muted-foreground")} />
                      Tax Deduction {editForm.hasIncomeTaxDeduction ? "ON" : "OFF"}
                    </button>
                    {editForm.hasIncomeTaxDeduction && <Input className="w-20" type="number" value={editForm.incomeTaxRate} onChange={(e) => setEditForm({ ...editForm, incomeTaxRate: e.target.value })} />}
                  </div>
                </div>
                <Button className="w-full" onClick={handleSave}><Save className="h-4 w-4" /> Save Changes</Button>
              </div>
            ) : (
              <>
                {/* Financial Balance Summary */}
                {balance && (balance.completedCount > 0 || balance.plannedCount > 0) && (
                  <div className="rounded-xl border bg-secondary/30 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financial Balance</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Received</p>
                        <p className="text-lg font-bold text-emerald-600">{formatCurrency(balance.bankIn)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Paid</p>
                        <p className="text-lg font-bold text-rose-600">{formatCurrency(balance.bankOut)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Net Balance</p>
                        <p className={cn("text-lg font-bold", balance.netBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(balance.netBalance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Planned Pending</p>
                        <p className="text-lg font-bold text-violet-600">{formatCurrency(balance.plannedIn + balance.plannedOut)}</p>
                      </div>
                    </div>
                    {(balance.vatCollected > 0 || balance.vatPaid > 0) && (
                      <div className="border-t pt-2 grid grid-cols-2 gap-3">
                        <div><p className="text-xs text-muted-foreground">VAT Collected</p><p className="text-sm font-medium text-blue-600">{formatCurrency(balance.vatCollected)}</p></div>
                        <div><p className="text-xs text-muted-foreground">VAT Paid</p><p className="text-sm font-medium text-indigo-600">{formatCurrency(balance.vatPaid)}</p></div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {selected.email && <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Email</p><p className="text-sm">{selected.email}</p></div>}
                  {selected.phone && <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm">{selected.phone}</p></div>}
                  {selected.contactName && <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Contact</p><p className="text-sm">{selected.contactName}</p></div>}
                  {selected.address && <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Address</p><p className="text-sm">{selected.address}</p></div>}
                  <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">VAT</p><p className="text-sm">{selected.hasVat ? `${Number(selected.vatRate) * 100}%` : "No VAT"}</p></div>
                  <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Income Tax Deduction</p><p className="text-sm">{selected.hasIncomeTaxDeduction ? `${Number(selected.incomeTaxRate) * 100}%` : "None"}</p></div>
                  <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Payment Terms</p><p className="text-sm">{selected.defaultPaymentTermsDays} days</p></div>
                </div>
                {selected.notes && <div className="rounded-lg bg-secondary/30 p-3"><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{selected.notes}</p></div>}
              </>
            )}

            {selected.payments?.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Payments ({selected.payments.length})</h3>
                <div className="divide-y rounded-lg border">
                  {selected.payments.map((p: any) => {
                    const gross = Number(p.grossAmount) || Number(p.expectedAmount) || 0
                    return (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          {p.direction === "INBOUND" ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />}
                          <div>
                            <p className="font-medium">{p.description || p.number}</p>
                            <p className="text-xs text-muted-foreground">{new Date(p.plannedDate).toLocaleDateString()} · {p.status}</p>
                          </div>
                        </div>
                        <span className={cn("font-semibold", p.direction === "INBOUND" ? "text-emerald-600" : "text-rose-600")}>
                          {p.direction === "INBOUND" ? "+" : "-"}{formatCurrency(gross)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {selected.documents?.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Documents ({selected.documents.length})</h3>
                <div className="divide-y rounded-lg border">
                  {selected.documents.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{d.number} ({d.type})</span>
                      <span>{d.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selected.projects?.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Projects ({selected.projects.length})</h3>
                <div className="divide-y rounded-lg border">
                  {selected.projects.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{p.name}</span>
                      <Badge variant={p.status === "ACTIVE" ? "success" : "secondary"} className="text-xs">{p.status}</Badge>
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

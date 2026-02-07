"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SlideOver } from "@/components/ui/slide-over"
import { getParties, createParty, getPartyById, updateParty, deleteParty, getPartyStats } from "@/lib/actions/party-actions"
import { Plus, Building2, Users, Briefcase, Search, Phone, Mail, Trash2, Pencil, Save } from "lucide-react"

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
  const [form, setForm] = useState({ type: "VENDOR", name: "", email: "", phone: "", contactName: "", address: "", notes: "" })
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", contactName: "", address: "", notes: "" })

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
    await createParty({ organizationId: orgId, type: form.type as any, name: form.name, email: form.email || undefined, phone: form.phone || undefined, contactName: form.contactName || undefined, address: form.address || undefined, notes: form.notes || undefined })
    setShowCreate(false)
    setForm({ type: "VENDOR", name: "", email: "", phone: "", contactName: "", address: "", notes: "" })
    load()
  }

  const handleSelect = async (id: string) => {
    const p = await getPartyById(id)
    setSelected(p)
    setEditing(false)
    if (p) {
      setEditForm({ name: p.name, email: p.email || "", phone: p.phone || "", contactName: p.contactName || "", address: p.address || "", notes: p.notes || "" })
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
                <Button className="w-full" onClick={handleSave}><Save className="h-4 w-4" /> Save Changes</Button>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selected.email && <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm">{selected.email}</p></div>}
                  {selected.phone && <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm">{selected.phone}</p></div>}
                  {selected.contactName && <div><p className="text-xs text-muted-foreground">Contact</p><p className="text-sm">{selected.contactName}</p></div>}
                  {selected.address && <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm">{selected.address}</p></div>}
                  <div><p className="text-xs text-muted-foreground">VAT</p><p className="text-sm">{selected.hasVat ? `${Number(selected.vatRate) * 100}%` : "No VAT"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Payment Terms</p><p className="text-sm">{selected.defaultPaymentTermsDays} days</p></div>
                </div>
                {selected.notes && <div><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{selected.notes}</p></div>}
              </>
            )}

            {selected.payments?.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Recent Payments ({selected.payments.length})</h3>
                <div className="divide-y rounded-lg border">
                  {selected.payments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{p.description || p.number}</span>
                      <span className="font-medium">{Number(p.expectedAmount).toLocaleString()} EGP</span>
                    </div>
                  ))}
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

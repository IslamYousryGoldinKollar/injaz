"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge, StatusBadge } from "@/components/ui/badge"
import { Combobox } from "@/components/ui/combobox"
import { SlideOver } from "@/components/ui/slide-over"
import {
  getDraftPayments,
  getPaymentById,
  updateDraftPayment,
  confirmDraftPayment,
  deletePayment,
  getCategories,
} from "@/lib/actions/financial-actions"
import { getParties } from "@/lib/actions/party-actions"
import { getProjects } from "@/lib/actions/project-actions"
import { formatCurrency, cn } from "@/lib/utils"
import {
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  CheckCircle2,
  Mic,
  FileEdit,
  Inbox,
} from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function DraftPaymentsPage() {
  const { currentUser } = useUser()
  const [drafts, setDrafts] = useState<any[]>([])
  const [parties, setParties] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    direction: "OUTBOUND",
    partyId: "",
    categoryId: "",
    projectId: "",
    amount: "",
    description: "",
    date: "",
    method: "",
    notes: "",
    status: "PLANNED",
  })

  const orgId = currentUser?.organizationId

  const load = useCallback(async () => {
    if (!orgId) return
    const [d, pts, cats, prj] = await Promise.all([
      getDraftPayments(orgId),
      getParties(orgId),
      getCategories(orgId),
      getProjects(orgId),
    ])
    setDrafts(d)
    setParties(pts)
    setCategories(cats)
    setProjects(prj)
  }, [orgId])

  useEffect(() => {
    void load()
  }, [load])

  const handleSelect = async (id: string) => {
    const p = await getPaymentById(id)
    setSelected(p)
    setEditing(false)
    if (p) {
      setForm({
        direction: p.direction,
        partyId: p.partyId || "",
        categoryId: p.categoryId || "",
        projectId: p.projectId || "",
        amount: String(Number(p.expectedAmount)),
        description: p.description || "",
        date: p.plannedDate
          ? new Date(p.plannedDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        method: p.method || "",
        notes: p.notes || "",
        status: "PLANNED",
      })
    }
  }

  const handleSave = async () => {
    if (!selected) return
    await updateDraftPayment(selected.id, {
      direction: form.direction as any,
      partyId: form.partyId || null,
      categoryId: form.categoryId || null,
      projectId: form.projectId || null,
      plannedDate: form.date ? new Date(form.date) : undefined,
      expectedAmount: parseFloat(form.amount) || 0,
      method: (form.method || undefined) as any,
      description: form.description,
      notes: form.notes,
    })
    const updated = await getPaymentById(selected.id)
    setSelected(updated)
    setEditing(false)
    load()
  }

  const handleConfirm = async () => {
    if (!selected || !form.partyId || !form.amount) return
    await confirmDraftPayment(selected.id, {
      direction: form.direction as any,
      status: form.status as any,
      partyId: form.partyId,
      categoryId: form.categoryId || null,
      projectId: form.projectId || null,
      plannedDate: form.date ? new Date(form.date) : undefined,
      expectedAmount: parseFloat(form.amount),
      actualAmount:
        form.status === "COMPLETED" ? parseFloat(form.amount) : undefined,
      actualDate: form.status === "COMPLETED" ? new Date() : undefined,
      method: (form.method || undefined) as any,
      description: form.description,
      notes: form.notes,
    })
    setSelected(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this draft payment?")) return
    await deletePayment(id)
    setSelected(null)
    load()
  }

  const methods = [
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
    { value: "CHECK", label: "Check" },
    { value: "CASH", label: "Cash" },
    { value: "CREDIT_CARD", label: "Credit Card" },
    { value: "INSTAPAY", label: "InstaPay" },
    { value: "OTHER", label: "Other" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Draft Payments</h1>
          <p className="text-sm text-muted-foreground">
            Payments created from voice notes &amp; AI — review, complete, and
            confirm.
          </p>
        </div>
        <Badge variant="secondary">{drafts.length} drafts</Badge>
      </div>

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Inbox className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium">No draft payments</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Send a voice note via the AI chat or Telegram bot to create a
              draft payment for review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Pending Review ({drafts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {drafts.map((d: any) => (
                <button
                  key={d.id}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                  onClick={() => handleSelect(d.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        d.direction === "INBOUND"
                          ? "bg-emerald-50"
                          : "bg-rose-50"
                      )}
                    >
                      {d.direction === "INBOUND" ? (
                        <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-rose-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {d.party?.name || "Unknown Party"}
                        </p>
                        <Badge variant="warning" className="text-[10px]">
                          DRAFT
                        </Badge>
                        {d.voiceTranscript && (
                          <Mic className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {d.description || d.number}
                        {d.category ? ` · ${d.category.name}` : ""}
                        {d.project ? ` · ${d.project.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-semibold",
                        d.direction === "INBOUND"
                          ? "text-emerald-600"
                          : "text-rose-600"
                      )}
                    >
                      {d.direction === "INBOUND" ? "+" : "-"}
                      {formatCurrency(Number(d.expectedAmount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.plannedDate).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Draft Detail / Edit Slide-Over */}
      <SlideOver
        open={!!selected}
        onClose={() => {
          setSelected(null)
          setEditing(false)
        }}
        title={selected?.number || "Draft Payment"}
        wide
      >
        {selected && (
          <div className="space-y-6">
            {/* Header badges */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    selected.direction === "INBOUND"
                      ? "success"
                      : "destructive"
                  }
                >
                  {selected.direction === "INBOUND" ? "Income" : "Expense"}
                </Badge>
                <Badge variant="warning">DRAFT</Badge>
                <StatusBadge status={selected.status} />
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(!editing)}
                >
                  <FileEdit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(selected.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Voice transcript */}
            {selected.voiceTranscript && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-blue-700">
                  <Mic className="h-3 w-3" /> Voice Transcript
                </div>
                <p className="text-sm italic text-blue-900">
                  &ldquo;{selected.voiceTranscript}&rdquo;
                </p>
              </div>
            )}

            {/* Amount display */}
            {!editing && (
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p
                  className={cn(
                    "text-3xl font-bold",
                    selected.direction === "INBOUND"
                      ? "text-emerald-600"
                      : "text-rose-600"
                  )}
                >
                  {selected.direction === "INBOUND" ? "+" : "-"}
                  {formatCurrency(Number(selected.expectedAmount))}
                </p>
              </div>
            )}

            {/* View mode */}
            {!editing && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Party</p>
                  <p className="text-sm font-medium">
                    {selected.party?.name || (
                      <span className="text-amber-600">⚠ Not set</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm">
                    {selected.category?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="text-sm">
                    {selected.project?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Method</p>
                  <p className="text-sm">{selected.method || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Planned Date
                  </p>
                  <p className="text-sm">
                    {new Date(selected.plannedDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created By</p>
                  <p className="text-sm">{selected.createdBy?.name}</p>
                </div>
                {selected.description && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">
                      Description
                    </p>
                    <p className="text-sm">{selected.description}</p>
                  </div>
                )}
                {selected.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm">{selected.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Edit mode */}
            {editing && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {["OUTBOUND", "INBOUND"].map((d) => (
                    <Button
                      key={d}
                      variant={form.direction === d ? "default" : "outline"}
                      size="sm"
                      onClick={() => setForm({ ...form, direction: d })}
                      className="flex-1"
                    >
                      {d === "INBOUND" ? "Money In" : "Money Out"}
                    </Button>
                  ))}
                </div>
                <Combobox
                  options={parties.map((p: any) => ({
                    value: p.id,
                    label: p.name,
                    sublabel: p.type,
                  }))}
                  value={form.partyId}
                  onValueChange={(v) => setForm({ ...form, partyId: v })}
                  placeholder="Select party *"
                  searchPlaceholder="Search vendors, clients..."
                />
                <Combobox
                  options={categories.map((c: any) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  value={form.categoryId}
                  onValueChange={(v) => setForm({ ...form, categoryId: v })}
                  placeholder="Category (optional)"
                />
                <Combobox
                  options={projects.map((p: any) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  value={form.projectId}
                  onValueChange={(v) => setForm({ ...form, projectId: v })}
                  placeholder="Project (optional)"
                />
                <Input
                  type="number"
                  placeholder="Amount *"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                <Combobox
                  options={methods}
                  value={form.method}
                  onValueChange={(v) => setForm({ ...form, method: v })}
                  placeholder="Payment method (optional)"
                />
                <Input
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
                <Input
                  placeholder="Notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
                <Button className="w-full" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            )}

            {/* Confirm section */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="mb-2 font-semibold text-emerald-800">
                Confirm &amp; Move to Payments
              </h3>
              <p className="mb-3 text-xs text-emerald-700">
                This will remove the draft flag and move this payment to
                your real payment records.
                {!form.partyId && (
                  <span className="mt-1 block font-medium text-amber-700">
                    ⚠ A party must be assigned before confirming.
                  </span>
                )}
              </p>
              <div className="mb-3 flex gap-2">
                {["PLANNED", "COMPLETED"].map((s) => (
                  <Button
                    key={s}
                    variant={form.status === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setForm({ ...form, status: s })}
                    className="flex-1 text-xs"
                  >
                    {s === "PLANNED"
                      ? "Confirm as Planned"
                      : "Confirm as Completed"}
                  </Button>
                ))}
              </div>
              <Button
                className="w-full gap-2"
                variant="default"
                onClick={handleConfirm}
                disabled={!form.partyId || !form.amount}
              >
                <CheckCircle2 className="h-4 w-4" /> Confirm Payment
              </Button>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  )
}

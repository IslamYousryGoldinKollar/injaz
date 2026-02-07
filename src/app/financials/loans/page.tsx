"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SlideOver } from "@/components/ui/slide-over"
import { Combobox } from "@/components/ui/combobox"
import { getLoans, createLoan, updateLoan, deleteLoan } from "@/lib/actions/loan-actions"
import { formatCurrency, cn } from "@/lib/utils"
import { Plus, Trash2, ArrowUpRight, ArrowDownLeft, Landmark } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
const statusColors: Record<string, string> = {
  ACTIVE: "warning",
  PARTIALLY_REPAID: "info",
  FULLY_REPAID: "success",
}

export default function LoansPage() {
  const { allUsers } = useUser()
  const [loans, setLoans] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({
    ownerId: "", direction: "TO_COMPANY", principalAmount: "", loanDate: new Date().toISOString().split("T")[0], notes: "",
  })

  const load = useCallback(async () => {
    const filters: any = {}
    if (statusFilter) filters.status = statusFilter
    const l = await getLoans(filters)
    setLoans(l)
  }, [statusFilter])
  useEffect(() => { void load() }, [load])

  const totalToCompany = loans.filter(l => l.direction === "TO_COMPANY").reduce((s, l) => s + Number(l.currentBalance), 0)
  const totalFromCompany = loans.filter(l => l.direction === "FROM_COMPANY").reduce((s, l) => s + Number(l.currentBalance), 0)

  const handleCreate = async () => {
    if (!form.ownerId || !form.principalAmount) return
    const owner = allUsers.find((u: any) => u.id === form.ownerId)
    const amt = parseFloat(form.principalAmount)
    await createLoan({
      ownerId: form.ownerId,
      ownerName: owner?.name || "Unknown",
      direction: form.direction,
      principalAmount: amt,
      currentBalance: amt,
      loanDate: new Date(form.loanDate),
      notes: form.notes || undefined,
    })
    setShowCreate(false)
    setForm({ ownerId: "", direction: "TO_COMPANY", principalAmount: "", loanDate: new Date().toISOString().split("T")[0], notes: "" })
    load()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await updateLoan(id, { status })
    if (selected?.id === id) setSelected({ ...selected, status })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this loan?")) return
    await deleteLoan(id)
    setSelected(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Owner Loans</h1>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Loan</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowDownLeft className="h-4 w-4 text-emerald-600" /> Loans to Company</div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalToCompany)}</p>
            <p className="text-xs text-muted-foreground">Outstanding balance owed to owners</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowUpRight className="h-4 w-4 text-rose-600" /> Loans from Company</div>
            <p className="text-2xl font-bold text-rose-600">{formatCurrency(totalFromCompany)}</p>
            <p className="text-xs text-muted-foreground">Outstanding balance owed by owners</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1">
        {["", "ACTIVE", "PARTIALLY_REPAID", "FULLY_REPAID"].map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "ghost"} size="sm" onClick={() => setStatusFilter(s)}>
            {s ? s.replace("_", " ") : "All"}
          </Button>
        ))}
      </div>

      {loans.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Landmark className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No owner loans recorded.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {loans.map((l: any) => (
            <Card key={l.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setSelected(l)}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", l.direction === "TO_COMPANY" ? "bg-emerald-50" : "bg-rose-50")}>
                    {l.direction === "TO_COMPANY" ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> : <ArrowUpRight className="h-4 w-4 text-rose-600" />}
                  </div>
                  <div>
                    <p className="font-medium">{l.ownerName}</p>
                    <p className="text-xs text-muted-foreground">{l.direction === "TO_COMPANY" ? "Owner → Company" : "Company → Owner"} · {new Date(l.loanDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(Number(l.currentBalance))}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">of {formatCurrency(Number(l.principalAmount))}</span>
                    <Badge variant={statusColors[l.status] as any} className="text-xs">{l.status.replace("_", " ")}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="New Owner Loan">
        <div className="space-y-4">
          <Combobox
            options={allUsers.filter((u: any) => u.role === "Owner" || u.role === "Admin" || true).map((u: any) => ({ value: u.id, label: u.name }))}
            value={form.ownerId}
            onValueChange={(v) => setForm({ ...form, ownerId: v })}
            placeholder="Select owner *"
          />
          <div className="flex gap-2">
            <Button variant={form.direction === "TO_COMPANY" ? "default" : "outline"} className="flex-1 gap-1" onClick={() => setForm({ ...form, direction: "TO_COMPANY" })}>
              <ArrowDownLeft className="h-4 w-4" /> To Company
            </Button>
            <Button variant={form.direction === "FROM_COMPANY" ? "default" : "outline"} className="flex-1 gap-1" onClick={() => setForm({ ...form, direction: "FROM_COMPANY" })}>
              <ArrowUpRight className="h-4 w-4" /> From Company
            </Button>
          </div>
          <div><label className="mb-1 block text-xs font-medium">Amount</label><Input type="number" value={form.principalAmount} onChange={(e) => setForm({ ...form, principalAmount: e.target.value })} placeholder="0" /></div>
          <div><label className="mb-1 block text-xs font-medium">Loan Date</label><Input type="date" value={form.loanDate} onChange={(e) => setForm({ ...form, loanDate: e.target.value })} /></div>
          <textarea className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button className="w-full" onClick={handleCreate} disabled={!form.ownerId || !form.principalAmount}>Create Loan</Button>
        </div>
      </SlideOver>

      {/* Detail */}
      <SlideOver open={!!selected} onClose={() => setSelected(null)} title={`${selected?.ownerName} Loan`}>
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Badge variant={statusColors[selected.status] as any}>{selected.status.replace("_", " ")}</Badge>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(selected.id)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Owner</p><p className="text-sm font-medium">{selected.ownerName}</p></div>
              <div><p className="text-xs text-muted-foreground">Direction</p><p className="text-sm">{selected.direction === "TO_COMPANY" ? "Owner → Company" : "Company → Owner"}</p></div>
              <div><p className="text-xs text-muted-foreground">Principal</p><p className="text-sm font-semibold">{formatCurrency(Number(selected.principalAmount))}</p></div>
              <div><p className="text-xs text-muted-foreground">Current Balance</p><p className="text-sm font-bold text-primary">{formatCurrency(Number(selected.currentBalance))}</p></div>
              <div><p className="text-xs text-muted-foreground">Loan Date</p><p className="text-sm">{new Date(selected.loanDate).toLocaleDateString()}</p></div>
              {selected.notes && <div className="col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{selected.notes}</p></div>}
            </div>
            {selected.payments?.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Linked Payments</h3>
                <div className="divide-y rounded-lg border">
                  {selected.payments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{p.description || p.number}</span>
                      <span className="font-medium">{formatCurrency(Number(p.expectedAmount))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="mb-2 font-semibold">Update Status</h3>
              <div className="flex flex-wrap gap-1">
                {["ACTIVE", "PARTIALLY_REPAID", "FULLY_REPAID"].map((s) => (
                  <Button key={s} variant={selected.status === s ? "default" : "outline"} size="sm" className="text-xs" onClick={() => handleStatusChange(selected.id, s)}>
                    {s.replace("_", " ")}
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

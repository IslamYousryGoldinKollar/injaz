"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { getDrafts, updateDraftStatus } from "@/lib/actions/draft-actions"
import { FileText, CheckCircle2, X, Clock, Mic, FileUp, PenLine } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
const sourceIcons: Record<string, any> = { VOICE: Mic, DOCUMENT: FileUp, MANUAL: PenLine }
const statusColors: Record<string, string> = {
  PENDING: "warning",
  REVIEWED: "info",
  PUSHED: "success",
  REJECTED: "destructive",
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([])
  const [filter, setFilter] = useState("")

  const load = useCallback(async () => {
    const d = await getDrafts(filter || undefined)
    setDrafts(d)
  }, [filter])
  useEffect(() => { void load() }, [load])

  const handleStatus = async (id: string, status: string) => {
    await updateDraftStatus(id, status)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financial Drafts</h1>
        <Badge variant="secondary">{drafts.length} drafts</Badge>
      </div>

      <div className="flex gap-1">
        {["", "PENDING", "REVIEWED", "PUSHED", "REJECTED"].map((s) => (
          <Button key={s} variant={filter === s ? "default" : "ghost"} size="sm" onClick={() => setFilter(s)}>
            {s || "All"}
          </Button>
        ))}
      </div>

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="font-medium">No drafts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Voice notes and AI-detected transactions will appear here for review before being pushed to your books.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drafts.map((d: any) => {
            const SourceIcon = sourceIcons[d.source] || FileText
            return (
              <Card key={d.id}>
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <SourceIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.description || d.type}</span>
                      <Badge variant={(statusColors[d.status] || "secondary") as any} className="text-xs">{d.status}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      {d.partyName && <span>{d.partyName}</span>}
                      {d.amount && <span className="font-medium">{formatCurrency(Number(d.amount))}</span>}
                      {d.direction && <span>{d.direction === "INBOUND" ? "Income" : "Expense"}</span>}
                      {d.category && <span>{d.category}</span>}
                      {d.date && <span>{new Date(d.date).toLocaleDateString()}</span>}
                    </div>
                    {d.transcript && (
                      <p className="mt-2 text-xs italic text-muted-foreground line-clamp-2">&ldquo;{d.transcript}&rdquo;</p>
                    )}
                    {d.confidence && (
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className={Number(d.confidence) > 0.8 ? "text-emerald-600" : "text-amber-600"}>
                          {(Number(d.confidence) * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                  {d.status === "PENDING" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs text-emerald-600" onClick={() => handleStatus(d.id, "REVIEWED")}>
                        <CheckCircle2 className="h-3 w-3" /> Review
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs text-rose-600" onClick={() => handleStatus(d.id, "REJECTED")}>
                        <X className="h-3 w-3" /> Reject
                      </Button>
                    </div>
                  )}
                  {d.status === "REVIEWED" && (
                    <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => handleStatus(d.id, "PUSHED")}>
                      <Clock className="h-3 w-3" /> Push to Books
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

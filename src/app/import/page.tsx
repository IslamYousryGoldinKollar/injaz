"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, CheckCircle2, Loader2, FileSpreadsheet } from "lucide-react"

export default function ImportPage() {
  const { authUser } = useAuth()
  const [csv, setCsv] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState("")

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCsv(ev.target?.result as string)
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!csv || !authUser) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, userId: authUser.uid }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setResult(data.stats)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const stats = result as Record<string, unknown> | null

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Import Data</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> CSV Import</CardTitle>
          <CardDescription>
            Upload a CSV file with columns: Date, Description, Party, Type (income/expense), Status (planned/completed), Category, Amount, Project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border-2 border-dashed p-6 text-center">
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {csv ? `✓ ${csv.split("\n").length - 1} rows loaded` : "Click to upload CSV"}
              </p>
            </label>
          </div>

          {csv && (
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Preview (first 3 rows):</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                {csv.split("\n").slice(0, 4).join("\n")}
              </pre>
            </div>
          )}

          <Button className="w-full" onClick={handleImport} disabled={!csv || loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</> : <><Upload className="h-4 w-4" /> Import Data</>}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {stats && (
            <div className="rounded-lg border bg-emerald-50 p-4 space-y-2">
              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <CheckCircle2 className="h-5 w-5" /> Import Complete
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Parties:</span> <strong>{String(stats.parties)}</strong></div>
                <div><span className="text-muted-foreground">Categories:</span> <strong>{String(stats.categories)}</strong></div>
                <div><span className="text-muted-foreground">Projects:</span> <strong>{String(stats.projects)}</strong></div>
                <div>
                  <span className="text-muted-foreground">Payments:</span>{" "}
                  <strong>{String((stats.payments as Record<string, unknown>)?.created)}</strong>
                  {(stats.payments as Record<string, unknown>)?.skipped ? (
                    <span className="text-muted-foreground"> ({String((stats.payments as Record<string, unknown>)?.skipped)} skipped)</span>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

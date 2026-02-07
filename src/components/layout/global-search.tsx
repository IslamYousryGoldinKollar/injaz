"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { useRouter } from "next/navigation"
import { globalSearch } from "@/lib/actions/search-actions"
import { Search, X, Users, FolderKanban, ListTodo, Banknote, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

/* eslint-disable @typescript-eslint/no-explicit-any */
export function GlobalSearch() {
  const { currentUser } = useUser()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (!currentUser?.organizationId || q.length < 2) {
      setResults(null)
      return
    }
    setLoading(true)
    const r = await globalSearch(currentUser.organizationId, q)
    setResults(r)
    setLoading(false)
  }, [currentUser])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  const navigate = (path: string) => {
    router.push(path)
    setOpen(false)
    setQuery("")
    setResults(null)
  }

  const totalResults = results
    ? results.parties.length + results.projects.length + results.tasks.length + results.payments.length + results.documents.length
    : 0

  if (!currentUser) return null

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono sm:inline">⌘K</kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-xl border bg-card shadow-2xl">
            {/* Search input */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Search className={cn("h-4 w-4 shrink-0", loading ? "animate-pulse text-primary" : "text-muted-foreground")} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Search parties, projects, tasks, payments..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults(null) }}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Results */}
            {results && query.length >= 2 && (
              <div className="max-h-80 overflow-y-auto p-2">
                {totalResults === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
                ) : (
                  <>
                    {results.parties.length > 0 && (
                      <ResultSection title="Parties" icon={Users}>
                        {results.parties.map((p: any) => (
                          <ResultItem key={p.id} onClick={() => navigate("/parties")} primary={p.name} secondary={p.type} />
                        ))}
                      </ResultSection>
                    )}
                    {results.projects.length > 0 && (
                      <ResultSection title="Projects" icon={FolderKanban}>
                        {results.projects.map((p: any) => (
                          <ResultItem key={p.id} onClick={() => navigate("/projects")} primary={p.name} secondary={p.status} color={p.color} />
                        ))}
                      </ResultSection>
                    )}
                    {results.tasks.length > 0 && (
                      <ResultSection title="Tasks" icon={ListTodo}>
                        {results.tasks.map((t: any) => (
                          <ResultItem key={t.id} onClick={() => navigate("/tasks")} primary={t.title} secondary={`${t.status}${t.project ? ` · ${t.project.name}` : ""}`} />
                        ))}
                      </ResultSection>
                    )}
                    {results.payments.length > 0 && (
                      <ResultSection title="Payments" icon={Banknote}>
                        {results.payments.map((p: any) => (
                          <ResultItem key={p.id} onClick={() => navigate("/financials")} primary={p.description || p.number} secondary={p.direction} />
                        ))}
                      </ResultSection>
                    )}
                    {results.documents.length > 0 && (
                      <ResultSection title="Documents" icon={FileText}>
                        {results.documents.map((d: any) => (
                          <ResultItem key={d.id} onClick={() => navigate("/financials/invoices")} primary={d.number} secondary={d.type} />
                        ))}
                      </ResultSection>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Footer hint */}
            <div className="border-t px-4 py-2 text-xs text-muted-foreground">
              <kbd className="rounded border bg-background px-1 py-0.5 font-mono text-[10px]">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ResultSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground">
        <Icon className="h-3 w-3" /> {title}
      </div>
      {children}
    </div>
  )
}

function ResultItem({ primary, secondary, color, onClick }: { primary: string; secondary?: string; color?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
    >
      {color && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
      <span className="flex-1 truncate font-medium">{primary}</span>
      {secondary && <span className="shrink-0 text-xs text-muted-foreground">{secondary}</span>}
    </button>
  )
}

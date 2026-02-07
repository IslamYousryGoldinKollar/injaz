"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useUser } from "@/contexts/user-context"
import { Sidebar } from "./sidebar"
import { NotificationBell } from "./notification-bell"
import { GlobalSearch } from "./global-search"
import { Loader2, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AppShell({ children }: { children: React.ReactNode }) {
  const { authUser, loading: authLoading } = useAuth()
  const { loading: userLoading } = useUser()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (authLoading || (authUser && userLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!authUser) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <span className="text-lg font-bold text-primary">Injaz</span>
          </div>
          <NotificationBell />
        </div>
        {/* Desktop top bar */}
        <div className="hidden h-12 items-center justify-end gap-2 border-b px-6 md:flex">
          <GlobalSearch />
          <NotificationBell />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

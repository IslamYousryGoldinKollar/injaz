"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  CalendarCheck2,
  Users,
  Settings,
  LogOut,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Upload,
  FileText,
  Wallet,
  RefreshCw,
  Landmark,
  Percent,
  FileStack,
  BarChart3,
} from "lucide-react"
import { useState } from "react"
import type { LucideIcon } from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  section?: string
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "AI Assistant", href: "/ai", icon: Sparkles },
  { label: "Parties", href: "/parties", icon: Users, section: "Business" },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Tasks", href: "/tasks", icon: ListTodo },
  { label: "Day Planner", href: "/day", icon: CalendarCheck2 },
  { label: "Payments", href: "/financials", icon: Banknote, section: "Finance" },
  { label: "Documents", href: "/financials/invoices", icon: FileText },
  { label: "Salaries", href: "/financials/salaries", icon: Wallet },
  { label: "Recurring", href: "/financials/recurring", icon: RefreshCw },
  { label: "Loans", href: "/financials/loans", icon: Landmark },
  { label: "VAT", href: "/financials/vat", icon: Percent },
  { label: "Drafts", href: "/financials/drafts", icon: FileStack },
  { label: "Reports", href: "/reports", icon: BarChart3, section: "System" },
  { label: "Import", href: "/import", icon: Upload },
  { label: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname()
  const { currentUser } = useUser()
  const { signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/" className="text-xl font-bold text-primary">
            Injaz
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href
            return (
              <li key={item.href}>
                {item.section && !collapsed && (
                  <p className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">{item.section}</p>
                )}
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User + Logout */}
      <div className="border-t p-3">
        {currentUser && !collapsed && (
          <div className="mb-2 truncate px-1 text-xs text-muted-foreground">
            {currentUser.name}
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={signOut}
          className={cn("w-full", collapsed ? "justify-center" : "justify-start")}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </aside>
  )
}

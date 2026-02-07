"use client"

import { useAuth } from "@/contexts/auth-context"
import { useUser } from "@/contexts/user-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Banknote,
  FolderKanban,
  ListTodo,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react"
import Link from "next/link"

const quickLinks = [
  { label: "Financials", href: "/financials", icon: Banknote, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Projects", href: "/projects", icon: FolderKanban, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Tasks", href: "/tasks", icon: ListTodo, color: "text-violet-600", bg: "bg-violet-50" },
  { label: "Drafts", href: "/financials/drafts", icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
  { label: "Invoices", href: "/financials/invoices", icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-50" },
  { label: "Users", href: "/settings/users", icon: Users, color: "text-cyan-600", bg: "bg-cyan-50" },
]

export default function DashboardPage() {
  const { authUser } = useAuth()
  const { currentUser } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!authUser) router.push("/login")
  }, [authUser, router])

  if (!authUser || !currentUser) return null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {currentUser.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s your overview for today
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`rounded-lg p-2.5 ${item.bg}`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <CardTitle className="text-base">{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage {item.label.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

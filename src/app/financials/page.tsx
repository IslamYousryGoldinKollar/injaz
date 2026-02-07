"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Banknote, TrendingUp, TrendingDown, Wallet } from "lucide-react"

export default function FinancialsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financial Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Revenue", value: "—", icon: TrendingUp, color: "text-emerald-600" },
          { label: "Expenses", value: "—", icon: TrendingDown, color: "text-rose-600" },
          { label: "Net Profit", value: "—", icon: Banknote, color: "text-blue-600" },
          { label: "Cash Balance", value: "—", icon: Wallet, color: "text-violet-600" },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No payments yet. Start by creating your first payment.</p>
        </CardContent>
      </Card>
    </div>
  )
}

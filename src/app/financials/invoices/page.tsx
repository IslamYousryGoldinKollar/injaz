"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Invoices</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        </CardContent>
      </Card>
    </div>
  )
}

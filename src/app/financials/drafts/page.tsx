"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function DraftsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financial Drafts</h1>
      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Drafts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No drafts yet. Use voice recording or document upload to create financial entries.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function DayPlannerPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Day Planner</h1>
        <Button>
          <Plus className="h-4 w-4" /> Quick Task
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No tasks for today. Add a quick task to get started.</p>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getAllUsers, updateUserRole, updateUserApproval } from "@/lib/actions/user-actions"
import { Users, Shield, ShieldCheck, ShieldAlert } from "lucide-react"

/* eslint-disable @typescript-eslint/no-explicit-any */
const roles = ["Admin", "Manager", "Employee", "Viewer"]

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])

  const load = useCallback(async () => {
    const u = await getAllUsers()
    setUsers(u)
  }, [])
  useEffect(() => { void load() }, [load])

  const handleRoleChange = async (userId: string, role: string) => {
    await updateUserRole(userId, role)
    load()
  }

  const handleApproval = async (userId: string, status: string) => {
    await updateUserApproval(userId, status)
    load()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team Members</h1>
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" /> {users.length} members
        </Badge>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No team members yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((u: any) => (
            <Card key={u.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {u.name?.charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.approvalStatus === "approved" ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  ) : u.approvalStatus === "rejected" ? (
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                  ) : (
                    <Shield className="h-4 w-4 text-amber-600" />
                  )}
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="rounded-md border bg-transparent px-2 py-1 text-xs"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {u.approvalStatus === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600" onClick={() => handleApproval(u.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600" onClick={() => handleApproval(u.id, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

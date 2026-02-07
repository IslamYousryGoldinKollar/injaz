"use client"

import { useState, useEffect, useCallback } from "react"
import { useUser } from "@/contexts/user-context"
import { Button } from "@/components/ui/button"
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/lib/actions/notification-actions"
import { Bell, Check, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

/* eslint-disable @typescript-eslint/no-explicit-any */
export function NotificationBell() {
  const { currentUser } = useUser()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(0)

  const load = useCallback(async () => {
    if (!currentUser) return
    const [n, c] = await Promise.all([
      getNotifications(currentUser.id),
      getUnreadCount(currentUser.id),
    ])
    setNotifications(n)
    setUnread(c)
  }, [currentUser])

  useEffect(() => { void load() }, [load])

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  const handleRead = async (id: string) => {
    await markAsRead(id)
    load()
  }

  const handleReadAll = async () => {
    if (!currentUser) return
    await markAllAsRead(currentUser.id)
    load()
  }

  if (!currentUser) return null

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => setOpen(!open)}>
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unread > 0 && (
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleReadAll}>
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 border-b px-4 py-3 text-sm transition-colors last:border-0",
                      !n.isRead && "bg-primary/5"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <Link href={n.link} className="hover:underline" onClick={() => { handleRead(n.id); setOpen(false) }}>
                        <p className={cn("text-sm", !n.isRead && "font-medium")}>{n.message}</p>
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {!n.isRead && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRead(n.id)}>
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

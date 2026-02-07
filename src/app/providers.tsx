"use client"

import { AuthProvider } from "@/contexts/auth-context"
import { UserProvider } from "@/contexts/user-context"
import { AppShell } from "@/components/layout/app-shell"
import { ToastProvider } from "@/components/ui/toast"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UserProvider>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </UserProvider>
    </AuthProvider>
  )
}

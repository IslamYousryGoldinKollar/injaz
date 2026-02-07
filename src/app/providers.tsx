"use client"

import { AuthProvider } from "@/contexts/auth-context"
import { UserProvider } from "@/contexts/user-context"
import { AppShell } from "@/components/layout/app-shell"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UserProvider>
        <AppShell>{children}</AppShell>
      </UserProvider>
    </AuthProvider>
  )
}

"use client"

import { AuthProvider } from "@/contexts/auth-context"
import { UserProvider } from "@/contexts/user-context"
import { AppShell } from "@/components/layout/app-shell"
import { ToastProvider } from "@/components/ui/toast"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { ThemeProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <UserProvider>
          <ToastProvider>
            <AppShell>
              <ErrorBoundary>{children}</ErrorBoundary>
            </AppShell>
          </ToastProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

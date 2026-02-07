"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { syncUserFromFirebase, getAllUsers } from "@/lib/actions/user-actions"

interface AppUser {
  id: string
  name: string
  email: string
  role: string
  avatar?: string | null
  approvalStatus: string
  organizationId?: string
}

interface UserContextType {
  currentUser: AppUser | null
  allUsers: AppUser[]
  loading: boolean
  refreshUsers: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const { authUser, loading: authLoading } = useAuth()
  const [allUsers, setAllUsers] = useState<AppUser[]>([])
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUsers = useCallback(async () => {
    try {
      const users = await getAllUsers()
      setAllUsers(users as AppUser[])
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!authUser) {
      setCurrentUser(null)
      setLoading(false)
      return
    }

    const syncUser = async () => {
      try {
        const synced = await syncUserFromFirebase({
          uid: authUser.uid,
          email: authUser.email!,
          displayName: authUser.displayName,
        })
        setCurrentUser(synced as AppUser)
        await refreshUsers()
      } catch (error) {
        console.error("Failed to sync user:", error)
      } finally {
        setLoading(false)
      }
    }

    syncUser()
  }, [authUser, authLoading, refreshUsers])

  return (
    <UserContext.Provider value={{ currentUser, allUsers, loading, refreshUsers }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) throw new Error("useUser must be used within UserProvider")
  return context
}

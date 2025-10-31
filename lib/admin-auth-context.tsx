"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authApi } from '@/lib/api'
import { STORAGE_KEYS, saveToStorage, loadFromStorage, removeFromStorage } from '@/lib/data-utils'
import type { AuthUser } from '@/lib/types'

interface AdminAuthContextType {
  adminUser: AuthUser | null
  isAdminAuthenticated: boolean
  adminLogin: (credentials: { email: string; password: string }) => Promise<void>
  adminLogout: () => Promise<void>
  isLoading: boolean
  isAuthenticating: boolean
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

const clearAdminStorage = () => {
  removeFromStorage(STORAGE_KEYS.ADMIN_USER)
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_ACCESS_TOKEN)
    const sessionRole = localStorage.getItem(STORAGE_KEYS.SESSION_ROLE)
    if (sessionRole === 'admin') {
      localStorage.removeItem(STORAGE_KEYS.SESSION_ROLE)
    }
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    const initialize = async () => {
      try {
        const sessionRole = localStorage.getItem(STORAGE_KEYS.SESSION_ROLE)
        const adminToken = localStorage.getItem(STORAGE_KEYS.ADMIN_ACCESS_TOKEN)

        if (sessionRole !== 'admin' || !adminToken) {
          clearAdminStorage()
          setAdminUser(null)
          return
        }

        const cachedAdmin = loadFromStorage<AuthUser>(STORAGE_KEYS.ADMIN_USER)
        if (cachedAdmin) {
          setAdminUser(cachedAdmin)
          return
        }

        const current = await authApi.me()
        if (current.role !== 'admin') {
          clearAdminStorage()
          setAdminUser(null)
          return
        }

        setAdminUser(current)
        saveToStorage(STORAGE_KEYS.ADMIN_USER, current)
      } catch (error) {
        console.error('Failed to restore admin session:', error)
        clearAdminStorage()
        setAdminUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [])

  useEffect(() => {
    if (isLoading) {
      return
    }

    const isAdminRoute = pathname.startsWith('/admin')
    const isLoginPage = pathname === '/admin/login'

    if (isAdminRoute && !isLoginPage && !adminUser) {
      router.replace('/admin/login')
    }
  }, [adminUser, pathname, router, isLoading])

  const adminLogin = useCallback(async (credentials: { email: string; password: string }) => {
    setIsAuthenticating(true)

    try {
      const { user, tokens } = await authApi.adminLogin(credentials)

      if (user.role !== 'admin') {
        throw new Error('That account does not have administrator access.')
      }

      setAdminUser(user)
      saveToStorage(STORAGE_KEYS.ADMIN_USER, user)

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.SESSION_ROLE, 'admin')
        localStorage.setItem(STORAGE_KEYS.ADMIN_ACCESS_TOKEN, tokens.accessToken)
        // Clear any student session tokens to avoid conflicts
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
        removeFromStorage(STORAGE_KEYS.USER)
      }
    } catch (error) {
      clearAdminStorage()
      setAdminUser(null)

      const message =
        error instanceof Error
          ? error.message || 'Unable to sign in with those credentials. Please try again.'
          : 'Unable to sign in with those credentials. Please try again.'

      throw new Error(message)
    } finally {
      setIsAuthenticating(false)
    }
  }, [])

  const adminLogout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.warn('Admin logout failed:', error)
    } finally {
      clearAdminStorage()
      setAdminUser(null)
      router.push('/admin/login')
    }
  }, [router])

  const value: AdminAuthContextType = {
    adminUser,
    isAdminAuthenticated: !!adminUser,
    adminLogin,
    adminLogout,
    isLoading,
    isAuthenticating,
  }

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}

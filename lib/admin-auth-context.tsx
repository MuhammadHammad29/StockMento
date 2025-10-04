"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface AdminUser {
  email: string
  role: string
  name: string
}

interface AdminAuthContextType {
  adminUser: AdminUser | null
  isAdminAuthenticated: boolean
  adminLogin: (user: AdminUser) => void
  adminLogout: () => void
  isLoading: boolean
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check for existing admin session on mount
    const checkAdminAuth = () => {
      try {
        const isAuthenticated = localStorage.getItem("admin_authenticated") === "true"
        const storedUser = localStorage.getItem("admin_user")
        
        if (isAuthenticated && storedUser) {
          const user = JSON.parse(storedUser)
          setAdminUser(user)
        }
      } catch (error) {
        console.error("Error checking admin auth:", error)
        // Clear invalid session
        localStorage.removeItem("admin_authenticated")
        localStorage.removeItem("admin_user")
      }
      setIsLoading(false)
    }

    checkAdminAuth()
  }, [])

  useEffect(() => {
    // Redirect logic based on authentication state and current path
    if (!isLoading) {
      const isAdminRoute = pathname.startsWith('/admin')
      const isLoginPage = pathname === '/admin/login'
      
      if (isAdminRoute && !isLoginPage && !adminUser) {
        // User is on admin route but not authenticated, redirect to login
        router.push('/admin/login')
      } else if (isLoginPage && adminUser) {
        // User is authenticated but on login page, redirect to dashboard
        router.push('/admin')
      }
    }
  }, [adminUser, pathname, router, isLoading])

  const adminLogin = (user: AdminUser) => {
    setAdminUser(user)
    localStorage.setItem("admin_authenticated", "true")
    localStorage.setItem("admin_user", JSON.stringify(user))
  }

  const adminLogout = () => {
    setAdminUser(null)
    localStorage.removeItem("admin_authenticated")
    localStorage.removeItem("admin_user")
    router.push('/admin/login')
  }

  const value = {
    adminUser,
    isAdminAuthenticated: !!adminUser,
    adminLogin,
    adminLogout,
    isLoading
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}
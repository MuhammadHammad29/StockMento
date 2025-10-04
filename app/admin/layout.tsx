"use client"

import { AdminAuthProvider, useAdminAuth } from "@/lib/admin-auth-context"
import { usePathname } from "next/navigation"

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { isAdminAuthenticated, isLoading } = useAdminAuth()
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin/login'

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-emerald-600 rounded-full animate-pulse"></div>
          <div className="w-4 h-4 bg-emerald-600 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-4 h-4 bg-emerald-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    )
  }

  // Always show login page
  if (isLoginPage) {
    return <>{children}</>
  }

  // For other admin pages, check authentication
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Please sign in to access the admin dashboard.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </AdminAuthProvider>
  )
}


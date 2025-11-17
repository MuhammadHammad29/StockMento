/**
 * Admin Navigation Component
 * 
 * Navigation bar specifically for admin pages with admin-specific links and functionality.
 * Extends BaseNavbar with admin-specific features like course management and analytics links.
 */

"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, BarChart3 } from "lucide-react"
import BaseNavbar from "./BaseNavbar"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { getAvatarPath } from "@/lib/avatar-utils"

interface AdminNavbarProps {
  className?: string
}

export default function AdminNavbar({ className }: AdminNavbarProps) {
  const { adminUser, adminLogout } = useAdminAuth()
  const pathname = usePathname()

  const isCoursesActive = pathname.startsWith('/admin/courses')
  const isAnalyticsActive = pathname.startsWith('/admin/analytics')

  const mobileMenuContent = (
    <nav className="flex flex-col gap-3 mt-6">
      <Link 
        href="/admin/courses" 
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
          isCoursesActive 
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' 
            : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
        }`}
      >
        <BookOpen className="h-4 w-4" />
        Manage Courses
      </Link>
      <Link 
        href="/admin/analytics" 
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
          isAnalyticsActive 
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' 
            : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
        }`}
      >
        <BarChart3 className="h-4 w-4" />
        Analytics
      </Link>
    </nav>
  )

  const desktopActions = (
    <>
      <Link 
        href="/admin/courses"
        className={`hidden lg:flex text-xs sm:text-sm transition-colors ${
          isCoursesActive 
            ? 'text-emerald-600 font-medium' 
            : 'text-muted-foreground hover:text-emerald-600'
        }`}
      >
        Courses
      </Link>
      <Link 
        href="/admin/analytics"
        className={`hidden lg:flex text-xs sm:text-sm transition-colors ${
          isAnalyticsActive 
            ? 'text-emerald-600 font-medium' 
            : 'text-muted-foreground hover:text-emerald-600'
        }`}
      >
        Analytics
      </Link>
    </>
  )

  return (
    <BaseNavbar
      className={className}
      userInfo={{
        name: adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : undefined,
        avatar: getAvatarPath('avatar_2'), // Using avatar_2 for admin
        role: 'admin'
      }}
      onLogout={adminLogout}
      mobileMenuContent={mobileMenuContent}
      desktopActions={desktopActions}
    />
  )
}

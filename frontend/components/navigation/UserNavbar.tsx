/**
 * User Navigation Component
 * 
 * Navigation bar specifically for authenticated user pages with user-specific links.
 * Extends BaseNavbar with user-specific features like dashboard, courses, progress, and profile.
 */

"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, TrendingUp } from "lucide-react"
import BaseNavbar from "./BaseNavbar"
import { useAuth } from "@/lib/auth-context"
import { getAvatarPath } from "@/lib/avatar-utils"

interface UserNavbarProps {
  className?: string
}

export default function UserNavbar({ className }: UserNavbarProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const isDashboardActive = pathname === '/dashboard'
  const isCoursesActive = pathname.startsWith('/courses') 
  const isProgressActive = pathname === '/progress'

  const mobileMenuContent = (
    <nav className="flex flex-col gap-3 mt-6">
      <Link 
        href="/dashboard" 
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
          isDashboardActive 
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' 
            : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
        }`}
      >
        <Home className="h-4 w-4" />
        Dashboard
      </Link>
      <Link 
        href="/courses" 
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
          isCoursesActive 
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' 
            : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
        }`}
      >
        <BookOpen className="h-4 w-4" />
        Courses
      </Link>
      <Link 
        href="/progress" 
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
          isProgressActive 
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' 
            : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
        }`}
      >
        <TrendingUp className="h-4 w-4" />
        Progress
      </Link>
    </nav>
  )

  const desktopActions = (
    <>
      <Link 
        href="/dashboard"
        className={`hidden lg:flex text-xs sm:text-sm transition-colors ${
          isDashboardActive 
            ? 'text-emerald-600 font-medium' 
            : 'text-muted-foreground hover:text-emerald-600'
        }`}
      >
        Dashboard
      </Link>
      <Link 
        href="/courses"
        className={`hidden lg:flex text-xs sm:text-sm transition-colors ${
          isCoursesActive 
            ? 'text-emerald-600 font-medium' 
            : 'text-muted-foreground hover:text-emerald-600'
        }`}
      >
        Courses
      </Link>
      <Link 
        href="/progress"
        className={`hidden lg:flex text-xs sm:text-sm transition-colors ${
          isProgressActive 
            ? 'text-emerald-600 font-medium' 
            : 'text-muted-foreground hover:text-emerald-600'
        }`}
      >
        Progress
      </Link>
    </>
  )

  return (
    <BaseNavbar
      className={className}
      userInfo={{
        name: user ? user.firstName : undefined,
        avatar: user?.avatarId ? getAvatarPath(user.avatarId) : undefined,
        role: 'user'
      }}
      onLogout={logout}
      mobileMenuContent={mobileMenuContent}
      desktopActions={desktopActions}
    />
  )
}

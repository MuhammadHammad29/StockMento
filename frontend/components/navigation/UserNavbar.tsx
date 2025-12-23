/**
 * User Navigation Component
 * 
 * Navigation bar specifically for authenticated user pages with user-specific links.
 * Extends BaseNavbar with user-specific features like dashboard, courses, progress, and profile.
 */

"use client"

import React from "react"
import Link from "next/link"

import { usePathname, useSearchParams } from "next/navigation"
import { Home, BookOpen, TrendingUp, LineChart, User as UserIcon, Settings } from "lucide-react"


import BaseNavbar from "./BaseNavbar"
import { useAuth } from "@/lib/auth-context"
import { getAvatarPath } from "@/lib/avatar-utils"

interface UserNavbarProps {
  className?: string
}

export default function UserNavbar({ className }: UserNavbarProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isDashboardActive = pathname === '/dashboard'
  const isCoursesActive = pathname.startsWith('/courses')
  const isProgressActive = pathname === '/progress'
  const isSimulatorActive = pathname.startsWith('/simulator')

  const isProfilePage = pathname === '/dashboard/profile'
  const isAccountSettingsActive = isProfilePage && searchParams?.get('tab') === 'settings'
  const isProfileOverviewActive = isProfilePage && !isAccountSettingsActive


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
      <Link 
        href="/simulator" 
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
          isSimulatorActive 
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' 
            : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
        }`}
      >
        <LineChart className="h-4 w-4" />
        Simulator
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
      <Link 
        href="/simulator"
        className={`hidden lg:flex text-xs sm:text-sm transition-colors ${
          isSimulatorActive 
            ? 'text-emerald-600 font-medium' 
            : 'text-muted-foreground hover:text-emerald-600'
        }`}
      >
        Simulator
      </Link>
    </>
  )

  const desktopUserMenuItems = (
    <>
      <Link
        href="/dashboard/profile"
        className={`flex items-center gap-3 rounded-lg px-4 py-2 transition-colors ${
          isProfileOverviewActive
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20'
            : 'text-muted-foreground hover:text-emerald-600 hover:bg-muted'
        }`}
      >
        <UserIcon className="h-4 w-4" />
        <span>Profile Overview</span>
      </Link>
      <Link
        href="/dashboard/profile?tab=settings"
        className={`flex items-center gap-3 rounded-lg px-4 py-2 transition-colors ${
          isAccountSettingsActive
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20'
            : 'text-muted-foreground hover:text-emerald-600 hover:bg-muted'
        }`}
      >
        <Settings className="h-4 w-4" />
        <span>Account Settings</span>
      </Link>
    </>
  )

  const mobileSecondaryContent = user ? (
    <div className="space-y-2 pt-2">
      <Link
        href="/dashboard/profile"
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
          isProfileOverviewActive
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20'
            : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
        }`}
      >
        <UserIcon className="h-4 w-4" />
        <span>Profile Overview</span>
      </Link>
      <Link
        href="/dashboard/profile?tab=settings"
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
          isAccountSettingsActive
            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20'
            : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
        }`}
      >
        <Settings className="h-4 w-4" />
        <span>Account Settings</span>
      </Link>
    </div>
  ) : null

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
      mobileSecondaryContent={mobileSecondaryContent}
      userMenuItems={desktopUserMenuItems}
      desktopActions={desktopActions}
    />
  )
}

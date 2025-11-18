/**
 * Base Navigation Component
 * 
 * Provides common navigation structure and functionality that all navbar variants extend.
 * Handles responsive layout, logo display, and mobile menu foundation.
 */

"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Menu, LogOut } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Logo from "@/components/ui/logo"

interface BaseNavbarProps {
  children?: React.ReactNode
  userInfo?: {
    name?: string
    avatar?: string
    role?: 'admin' | 'user'
  }
  onLogout?: () => void | Promise<void>
  mobileMenuContent?: React.ReactNode
  desktopActions?: React.ReactNode
  className?: string
}

export default function BaseNavbar({
  children,
  userInfo,
  onLogout,
  mobileMenuContent,
  desktopActions,
  className = ""
}: BaseNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <nav className={`sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70 overflow-hidden ${className}`}>
      <div className="mx-auto flex h-12 sm:h-14 lg:h-16 max-w-7xl items-center justify-between px-2 sm:px-3 lg:px-8">
        {/* Logo Section */}
        <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 min-w-0 flex-1">
          <div className="flex items-center space-x-1 min-w-0">
            {userInfo ? (
              <Link 
                href={userInfo.role === 'admin' ? '/admin' : '/dashboard'} 
                className="block hover:opacity-80 transition-opacity"
                title={`Go to ${userInfo.role === 'admin' ? 'Admin Dashboard' : 'Dashboard'}`}
              >
                <Logo size="sm" className="sm:hidden" />
                <Logo size="md" className="hidden sm:block" />
              </Link>
            ) : (
              <>
                <Logo size="sm" className="sm:hidden" />
                <Logo size="md" className="hidden sm:block" />
              </>
            )}
            {userInfo?.role === 'admin' && (
              <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300 text-xs flex-shrink-0">
                Admin
              </Badge>
            )}
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center space-x-2 lg:space-x-4">
          {userInfo?.name && (
            <span className="text-xs sm:text-sm text-muted-foreground hidden lg:block">
              Welcome, {userInfo.name}
            </span>
          )}
          {desktopActions}
          {userInfo && userInfo.role === 'user' ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  aria-label="User menu"
                >
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 hover:ring-2 hover:ring-emerald-200 dark:hover:ring-emerald-700 transition-all cursor-pointer">
                    <AvatarImage src={userInfo.avatar} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200 text-xs">
                      {userInfo.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  Signed in as
                  <div className="text-sm font-medium text-foreground">{userInfo.name ?? "Student"}</div>
                </div>
                <div className="space-y-1">
                  <Link
                    href="/dashboard/profile"
                    className="block rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                  >
                    Profile
                  </Link>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="w-full rounded-md px-2 py-1.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      Logout
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            userInfo && (
              <>
                {onLogout && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLogout}
                    className="text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-2"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Logout</span>
                  </Button>
                )}
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarImage src={userInfo.avatar} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200 text-xs">
                    {userInfo.name?.charAt(0) || 'AD'}
                  </AvatarFallback>
                </Avatar>
              </>
            )
          )}
        </div>

        {/* Mobile/Tablet Menu */}
        <div className="flex items-center space-x-2 lg:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-emerald-600 h-8 w-8">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]" aria-describedby={undefined}>
              <SheetHeader className="border-b pb-4">
                <SheetTitle className="flex items-center gap-3 text-left">
                  {userInfo && (
                    userInfo.role === 'user' ? (
                      <Link href="/dashboard/profile" onClick={() => setMobileMenuOpen(false)} title="Go to Profile">
                        <Avatar className="h-8 w-8 hover:ring-2 hover:ring-emerald-200 dark:hover:ring-emerald-700 transition-all cursor-pointer">
                          <AvatarImage src={userInfo.avatar} />
                          <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                            {userInfo.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    ) : (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userInfo.avatar} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                          {userInfo.name?.charAt(0) || 'AD'}
                        </AvatarFallback>
                      </Avatar>
                    )
                  )}
                  <span className="font-medium">{userInfo?.name || "Menu"}</span>
                </SheetTitle>
                <div className="text-left text-sm text-muted-foreground">
                  {userInfo?.role === 'admin' && (
                    <Badge className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-300 text-xs">
                      Admin Panel
                    </Badge>
                  )}
                  {userInfo?.role === 'user' && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300 text-xs">
                      Student Portal
                    </Badge>
                  )}
                </div>
              </SheetHeader>
              
              {mobileMenuContent}
              
              {onLogout && (
                <div className="mt-auto pt-6 border-t">
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      onLogout()
                    }}
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/20"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
      {children}
    </nav>
  )
}

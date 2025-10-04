/**
 * Root Layout Component
 * 
 * Main layout wrapper for the entire StockMento application.
 * Provides theme support, authentication context, and global styling.
 * Includes font configuration and analytics setup.
 */

import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'
import { ThemeToggle } from '@/components/theme-toggle'

// SEO Metadata configuration for the application
export const metadata: Metadata = {
  title: 'StockMento - Learn Pakistan Stock Exchange',
  description: 'Master the Pakistan Stock Exchange with expert-led courses, real-time simulations, and comprehensive trading education.',
  keywords: 'Pakistan Stock Exchange, PSX, trading education, stock market, investment',
  authors: [{ name: 'StockMento Team' }],
}

// Viewport configuration for responsive design
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

/**
 * Root Layout Component
 * 
 * Wraps the entire application with necessary providers:
 * - ThemeProvider: Enables dark/light mode switching
 * - AuthProvider: Handles user authentication state
 * - Font configuration: Applies Geist Sans and Mono fonts
 * - Analytics: Vercel analytics integration
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        {/* Theme Provider - Enables dark/light mode */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Authentication Context Provider */}
          <AuthProvider>
            {/* Main App Content */}
            {children}
            
            {/* Global Theme Toggle Button (positioned fixed) */}
            <div className="fixed bottom-4 right-4 z-50">
              <ThemeToggle />
            </div>
            
            {/* Toast Notifications */}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
        
        {/* Analytics Integration */}
        <Analytics />
      </body>
    </html>
  )
}

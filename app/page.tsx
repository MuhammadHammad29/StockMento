/**
 * StockMento Landing Page
 * 
 * Main marketing page for t            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="border-border/40 text-muted-foreground hover:text-emerald-600 hover:border-emerald-600/20">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>stan Stock Exchange learning platform.
 * Features hero section, features overview, courses preview, and footer.
 * Includes dark mode support and responsive design.
 */

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { BookOpen, Play, Trophy, Users, TrendingUp, Shield, Clock, Menu, Sparkles } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import Logo from "@/components/ui/logo"

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo and Name */}
          <div className="flex items-center space-x-2">
            {/* Mobile: Small logo */}
            <div className="block md:hidden">
              <Logo size="sm" className="h-auto" />
            </div>
            {/* Desktop: Medium logo */}
            <div className="hidden md:block">
              <Logo size="md" className="h-auto" />
            </div>
          </div>
          
          {/* Desktop Navigation Links */}
          <div className="hidden items-center space-x-8 md:flex">
            <Link href="#features" className="text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
              Features
            </Link>
            <Link href="#courses" className="text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
              Courses
            </Link>
            <Link href="#about" className="text-muted-foreground transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
              About
            </Link>
          </div>
          
          {/* Authentication Buttons - Desktop */}
          <div className="hidden items-center space-x-4 md:flex">
            <Link href="/signin">
              <Button variant="ghost" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-300">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu */}
          <div className="flex items-center space-x-2 md:hidden">
            <Link href="/signin">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-300">
                Sign In
              </Button>
            </Link>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="border-border/40 text-muted-foreground hover:text-emerald-600 hover:border-emerald-600/20">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="border-b pb-4">
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <Logo size="sm" className="h-auto" />
                  </SheetTitle>
                  <SheetDescription className="text-left">
                    Pakistan's Premier Stock Market Education Platform
                  </SheetDescription>
                </SheetHeader>
                <nav className="flex flex-col gap-3 mt-6">
                  <Link 
                    href="#features" 
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Features
                  </Link>
                  <Link 
                    href="#courses" 
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookOpen className="h-4 w-4" />
                    Courses
                  </Link>
                  <Link 
                    href="#about" 
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Users className="h-4 w-4" />
                    About
                  </Link>
                </nav>
                <div className="mt-auto pt-6 border-t">
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section - Main landing area with value proposition */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          {/* Platform Badge */}
          <Badge className="mb-6 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20">
            Pakistan's Premier Stock Market Education Platform
          </Badge>
          
          {/* Main Hero Heading */}
          <h1 className="text-balance mb-6 text-3xl font-bold text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
            Master the <span className="text-emerald-600 dark:text-emerald-400">Pakistan Stock Exchange</span>
          </h1>
          
          {/* Value Proposition Text */}
          <p className="text-pretty mx-auto mb-8 max-w-3xl text-lg sm:text-xl text-muted-foreground">
            Learn trading, investment strategies, and market analysis through comprehensive lessons designed for Pakistani investors.
          </p>
          
          {/* Call-to-Action Buttons */}
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="px-8 text-white">
                Start Learning Free
              </Button>
            </Link>
            <Link href="#demo">
              <Button
                size="lg"
                variant="outline"
                className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-card/60 py-16 dark:bg-slate-900/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
            {[
              { value: "50+", label: "Expert Lessons" },
              { value: "1000+", label: "Active Students" },
              { value: "15+", label: "Courses Available" },
              { value: "95%", label: "Success Rate" },
            ].map((stat) => (
              <div key={stat.label} className="py-4">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stat.value}</div>
                <div className="text-sm sm:text-base text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Everything You Need to Succeed</h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Comprehensive learning tools designed specifically for the Pakistani stock market
            </p>
          </div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <BookOpen className="mb-4 h-10 w-10 sm:h-12 sm:w-12 text-emerald-600 dark:text-emerald-400" />,
                title: "Interactive Lessons",
                description: "Learn through engaging text-based lessons and video tutorials from market experts",
              },
              {
                icon: <Play className="mb-4 h-10 w-10 sm:h-12 sm:w-12 text-blue-600 dark:text-blue-400" />,
                title: "Video Learning",
                description: "Watch expert-led video lessons covering trading strategies and market analysis",
              },
              {
                icon: <Users className="mb-4 h-10 w-10 sm:h-12 sm:w-12 text-purple-600 dark:text-purple-400" />,
                title: "Community Learning",
                description: "Learn alongside fellow investors and share experiences with the trading community",
              },
              {
                icon: <Shield className="mb-4 h-10 w-10 sm:h-12 sm:w-12 text-red-600 dark:text-red-400" />,
                title: "Progress Tracking",
                description: "Monitor your learning journey with detailed progress reports and achievements",
              },
              {
                icon: <Trophy className="mb-4 h-10 w-10 sm:h-12 sm:w-12 text-amber-500 dark:text-amber-300" />,
                title: "Trading Mastery",
                description: "Achieve trading mastery with progressive skill validation and recognition",
              },
              {
                icon: <Clock className="mb-4 h-10 w-10 sm:h-12 sm:w-12 text-teal-600 dark:text-teal-400" />,
                title: "Flexible Learning",
                description: "Study at your own pace with mobile-friendly lessons and downloadable resources",
              },
            ].map((feature) => (
              <Card key={feature.title} className="border border-border/60 bg-card/90 shadow-lg hover:shadow-xl transition-shadow dark:shadow-none">
                <CardHeader className="space-y-3">
                  {feature.icon}
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Course Preview Section */}
      <section id="courses" className="bg-muted/40 px-4 py-20 dark:bg-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Featured Learning Modules</h2>
            <p className="text-xl text-muted-foreground">Start with these popular courses designed for Pakistani investors</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "PSX Basics",
                level: "Beginner",
                duration: "2 hours",
                lessons: "8 lessons",
                description: "Learn the fundamentals of Pakistan Stock Exchange, how it works, and basic trading concepts.",
              },
              {
                title: "Technical Analysis",
                level: "Intermediate",
                duration: "4 hours",
                lessons: "12 lessons",
                description: "Master chart patterns, indicators, and technical analysis tools for better trading decisions.",
              },
              {
                title: "Risk Management",
                level: "Advanced",
                duration: "3 hours",
                lessons: "10 lessons",
                description: "Learn advanced risk management strategies and portfolio optimization techniques.",
              },
            ].map((course) => (
              <Card key={course.title} className="flex h-full flex-col border border-border/60 bg-card/90 shadow-md transition-shadow hover:shadow-lg dark:shadow-none">
                <CardHeader className="flex-1 space-y-3">
                  <CardTitle className="flex items-center justify-between">
                    {course.title}
                    <Badge variant="secondary">{course.level}</Badge>
                  </CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-1 h-4 w-4" />
                    <span>{course.duration}</span>
                    <span className="mx-2 text-muted-foreground">|</span>
                    <span>{course.lessons}</span>
                  </div>
                  <Button asChild className="w-full">
                    <Link href="/signup">Start Course</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-600 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">Ready to Start Your PSX Journey?</h2>
          <p className="mb-8 text-xl text-emerald-100">
            Join thousands of Pakistani investors who are already mastering the stock market
          </p>
          <Link href="/signup">
            <Button size="lg" className="px-8 bg-white text-emerald-600 hover:bg-emerald-50 dark:bg-white dark:text-emerald-600 dark:hover:bg-emerald-50">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 px-4 py-12 text-white dark:bg-slate-950 dark:text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="mb-4 flex items-center space-x-2">
                <Logo size="sm" className="h-auto" />
              </div>
              <p className="text-slate-300 dark:text-muted-foreground">
                Pakistan's premier platform for stock market education and trading knowledge.
              </p>
            </div>
            {[
              {
                title: "Courses",
                items: ["PSX Basics", "Technical Analysis", "Risk Management", "Portfolio Building"],
              },
              {
                title: "Support",
                items: ["Help Center", "Contact Us", "Community", "FAQ"],
              },
              {
                title: "Legal",
                items: ["Privacy Policy", "Terms of Service", "Disclaimer"],
              },
            ].map((column) => (
              <div key={column.title}>
                <h3 className="mb-4 font-semibold text-white dark:text-foreground">{column.title}</h3>
                <ul className="space-y-2 text-slate-300 dark:text-muted-foreground">
                  {column.items.map((item) => (
                    <li key={item}>
                      <Link href="#" className="transition-colors hover:text-white dark:hover:text-foreground">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 border-t border-slate-700 dark:border-border/60 pt-8 text-center text-slate-400 dark:text-muted-foreground">
            <p>&copy; 2025 StockMento. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

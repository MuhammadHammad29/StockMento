/**
 * StockMento Landing Page
 * 
 * Main marketing page for the Pakistan Stock Exchange learning platform.
 * Features hero section, features overview, courses preview, and footer.
 * Includes dark mode support and responsive design.
 */

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Play, Trophy, Users, TrendingUp, Shield, Clock } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo and Name */}
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-emerald-600" />
            <span className="text-xl font-bold text-foreground">StockMento</span>
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
          
          {/* Authentication Buttons */}
          <div className="flex items-center space-x-4">
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
          <h1 className="text-balance mb-6 text-4xl font-bold text-foreground md:text-6xl">
            Master the <span className="text-emerald-600 dark:text-emerald-400">Pakistan Stock Exchange</span>
          </h1>
          
          {/* Value Proposition Text */}
          <p className="text-pretty mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
            Learn trading, investment strategies, and market analysis through comprehensive lessons and real-world case studies designed for Pakistani investors.
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
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {[
              { value: "50+", label: "Expert Lessons" },
              { value: "1000+", label: "Active Students" },
              { value: "25+", label: "Case Studies" },
              { value: "95%", label: "Success Rate" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
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

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <BookOpen className="mb-4 h-12 w-12 text-emerald-600 dark:text-emerald-400" />,
                title: "Interactive Lessons",
                description: "Learn through engaging text-based lessons and video tutorials from market experts",
              },
              {
                icon: <Play className="mb-4 h-12 w-12 text-blue-600 dark:text-blue-400" />,
                title: "Video Learning",
                description: "Watch expert-led video lessons covering trading strategies and market analysis",
              },
              {
                icon: <Users className="mb-4 h-12 w-12 text-purple-600 dark:text-purple-400" />,
                title: "Case Studies",
                description: "Analyze real PSX scenarios and learn from successful trading strategies",
              },
              {
                icon: <Shield className="mb-4 h-12 w-12 text-red-600 dark:text-red-400" />,
                title: "Progress Tracking",
                description: "Monitor your learning journey with detailed progress reports and achievements",
              },
              {
                icon: <Trophy className="mb-4 h-12 w-12 text-amber-500 dark:text-amber-300" />,
                title: "Trading Mastery",
                description: "Achieve trading mastery with progressive skill validation and recognition",
              },
              {
                icon: <Clock className="mb-4 h-12 w-12 text-teal-600 dark:text-teal-400" />,
                title: "Flexible Learning",
                description: "Study at your own pace with mobile-friendly lessons and downloadable resources",
              },
            ].map((feature) => (
              <Card key={feature.title} className="border border-border/60 bg-card/90 shadow-lg hover:shadow-xl transition-shadow dark:shadow-none">
                <CardHeader>
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
              <Card key={course.title} className="border border-border/60 bg-card/90 shadow-md transition-shadow hover:shadow-lg dark:shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {course.title}
                    <Badge variant="secondary">{course.level}</Badge>
                  </CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-1 h-4 w-4" />
                    <span>{course.duration}</span>
                    <span className="mx-2 text-muted-foreground">|</span>
                    <span>{course.lessons}</span>
                  </div>
                  <Button className="w-full">Start Course</Button>
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
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
                <span className="text-lg font-bold text-white dark:text-foreground">StockMento</span>
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
            <p>&copy; 2024 StockMento. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

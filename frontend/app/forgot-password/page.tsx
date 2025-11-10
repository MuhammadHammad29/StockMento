"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"
import { validateEmail } from "@/lib/data-utils"
import Logo from "@/components/ui/logo"

/**
 * Forgot-password flow entry point. Collects the email and triggers the reset email.
 * Upon success shows a confirmation panel with retry and back-to-signin actions.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { resetPassword, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    if (!validateEmail(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    try {
      await resetPassword(email)
      setIsSubmitted(true)
      toast.success('If an account exists with this email, a password reset link has been sent.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email')
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center justify-center">
              <Logo size="lg" className="h-auto" />
            </Link>
          </div>

          <Card className="border border-border/60 bg-card/95 shadow-xl dark:shadow-none">
            <CardHeader className="space-y-1 text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-emerald-100 dark:bg-emerald-500/15 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
              <CardDescription>
                We&apos;ve sent password reset instructions to
                <br />
                <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground text-center space-y-2">
                <p>Didn&apos;t receive the email? Check your spam folder or</p>
                <Button 
                  variant="link" 
                  onClick={() => setIsSubmitted(false)}
                  className="p-0 h-auto text-emerald-600 dark:text-emerald-300"
                >
                  try again
                </Button>
              </div>
              
              <div className="pt-4">
                <Link href="/signin">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center">
            <Logo size="lg" className="h-auto" />
          </Link>
          <p className="text-muted-foreground mt-2">Reset your password</p>
        </div>

        <Card className="border border-border/60 bg-card/95 shadow-xl dark:shadow-none">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
            <CardDescription className="text-center">
              Enter your email address and we&apos;ll send you instructions to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email address" 
                    className="pl-10" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending instructions...
                  </>
                ) : (
                  'Send Reset Instructions'
                )}
              </Button>
            </form>

            <div className="text-center pt-4">
              <Link href="/signin">
                <Button variant="link" className="text-emerald-600 dark:text-emerald-300">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



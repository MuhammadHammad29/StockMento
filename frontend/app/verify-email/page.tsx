"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Shield, ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import Logo from "@/components/ui/logo"

/**
 * Email verification step shown right after signup.
 * Users enter the one-time code and can request manual resends with cooldown protection.
 */
export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { verifyEmail, sendVerificationCode } = useAuth()
  
  // Get email from URL params (passed from signup)
  const email = searchParams.get('email') || ''
  
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Triggered only via the resend button – we deliberately avoid auto-sending to prevent duplicate emails.
  const sendVerificationEmail = useCallback(async () => {
    try {
      await sendVerificationCode(email)
      toast.success('Verification code sent to your email!')
      setResendCooldown(60) // 60 seconds cooldown
    } catch (error) {
      console.error(error)
      toast.error('Failed to send verification email')
    }
  }, [email, sendVerificationCode])

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    
    setResendLoading(true)
    try {
      await sendVerificationEmail()
    } finally {
      setResendLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!verificationCode) {
      toast.error('Please enter the verification code')
      return
    }

    if (verificationCode.length !== 6) {
      toast.error('Verification code must be 6 digits')
      return
    }

    setLoading(true)

    try {
      await verifyEmail(email, verificationCode)
      toast.success('Email successfully verified!')
      router.replace('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@')
    if (username.length <= 2) return email
    const maskedUsername = username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
    return `${maskedUsername}@${domain}`
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Invalid Access</h1>
          <p className="text-muted-foreground mb-6">Please start the signup process from the beginning.</p>
          <Link href="/signup">
            <Button className="bg-emerald-600 hover:bg-emerald-700">Back to Sign Up</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center">
            <Logo size="lg" className="h-auto" />
          </Link>
          <p className="text-muted-foreground mt-2">Verify your email to continue</p>
        </div>

        <Card className="border border-border/60 bg-card/95 shadow-xl dark:shadow-none">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription className="text-center">
              We&apos;ve sent a 6-digit verification code to<br />
              <span className="font-medium text-foreground">{maskEmail(email)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="code" 
                    type="text"
                    placeholder="Enter 6-digit code"
                    className="pl-10 text-center text-lg tracking-widest font-mono"
                    value={verificationCode}
                    onChange={(e) => {
                      // Only allow numbers and limit to 6 digits
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setVerificationCode(value)
                    }}
                    maxLength={6}
                    required 
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Verify Email
                  </>
                )}
              </Button>
            </form>

            {/* Resend Code Section */}
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the code?
              </p>
              
              <Button 
                variant="outline" 
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || resendLoading}
                className="w-full"
              >
                {resendLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend in {resendCooldown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>

            {/* Back to Signup Link */}
            <div className="text-center">
              <Link 
                href="/signup" 
                className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back to Sign Up
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center mt-6 text-xs text-muted-foreground space-y-1">
          <p>Check your spam folder if you don&apos;t see the email</p>
          <p>The verification code expires shortly, so be sure to enter it soon.</p>
        </div>
      </div>
    </div>
  )
}




/**
 * Password reset screen. Users land here from the emailed link and can set a new password.
 * The token + email are encoded in the URL and posted back to the API.
 */
"use client"

import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Suspense, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Logo from "@/components/ui/logo"
import { Lock, Shield, Loader2, ArrowLeft } from "lucide-react"
import { authApi } from "@/lib/api"
import { Eye, EyeOff } from "lucide-react"
import { isPasswordValid } from "@/lib/password-utils"
import { PasswordStrengthIndicator } from "@/components/password-strength-indicator"

function ResetPasswordPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get("token") || ""
  const email = searchParams.get("email") || ""

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({
    newPassword: "",
    confirmPassword: "",
  })

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Invalid reset link</h1>
          <p className="text-muted-foreground mb-6">The password reset link is missing or incomplete.</p>
          <Link href="/forgot-password">
            <Button className="bg-emerald-600 hover:bg-emerald-700">Request a new link</Button>
          </Link>
        </div>
      </div>
    )
  }

  type ErrorKey = keyof typeof errors

  const validateField = (field: ErrorKey) => {
    let message = ""
    if (field === "newPassword") {
      if (!newPassword) {
        message = "New password is required."
      } else if (!isPasswordValid(newPassword)) {
        message = "Password must meet the security requirements."
      }
    } else if (field === "confirmPassword") {
      if (!confirmPassword) {
        message = "Please confirm your password."
      } else if (confirmPassword !== newPassword) {
        message = "Passwords must match."
      }
    }
    setErrors((prev) => ({ ...prev, [field]: message }))
    return !message
  }

  const validateForm = () => {
    return ["newPassword", "confirmPassword"].every((field) => validateField(field as ErrorKey))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!validateForm()) {
      toast.error("Please fix the highlighted fields before continuing.")
      return
    }
    setLoading(true)
    try {
      await authApi.confirmPasswordReset({
        email,
        token,
        password: newPassword,
      })
      toast.success("Password updated successfully! Please sign in.")
      router.push("/signin")
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Unable to reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center">
            <Logo size="lg" className="h-auto" />
          </Link>
          <p className="text-muted-foreground mt-2">Choose a new password for your account</p>
        </div>

        <Card className="border border-border/60 bg-card/95 shadow-xl dark:shadow-none">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Account: <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="password-input-container">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter a new password"
                    className={`pl-10 pr-12 password-input ${errors.newPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value)
                      if (errors.newPassword) {
                        setErrors((prev) => ({ ...prev, newPassword: "" }))
                      }
                    }}
                    onBlur={() => validateField("newPassword")}
                    aria-invalid={Boolean(errors.newPassword)}
                    aria-describedby={errors.newPassword ? "reset-newpassword-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="password-toggle-btn text-muted-foreground hover:text-foreground focus:text-foreground focus:outline-none transition-colors"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p id="reset-newpassword-error" className="text-xs text-destructive">
                    {errors.newPassword}
                  </p>
                )}
                
                {/* Password Strength Indicator */}
                <PasswordStrengthIndicator 
                  password={newPassword} 
                  showRequirements={true}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="password-input-container">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    className={`pl-10 pr-12 password-input ${errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value)
                      if (errors.confirmPassword) {
                        setErrors((prev) => ({ ...prev, confirmPassword: "" }))
                      }
                    }}
                    onBlur={() => validateField("confirmPassword")}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    aria-describedby={errors.confirmPassword ? "reset-confirmpassword-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="password-toggle-btn text-muted-foreground hover:text-foreground focus:text-foreground
                      focus:outline-none transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p id="reset-confirmpassword-error" className="text-xs text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>

            <div className="text-center">
              <Link
                href="/signin"
                className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
          <div className="text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <ResetPasswordPageInner />
    </Suspense>
  )
}

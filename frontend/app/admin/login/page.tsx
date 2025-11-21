"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAdminAuth } from "@/lib/admin-auth-context"
import Logo from "@/components/ui/logo"

export default function AdminLoginPage() {
  const router = useRouter()
  const { adminLogin, adminUser, isAuthenticating } = useAdminAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })

  useEffect(() => {
    if (adminUser) {
      router.replace("/admin")
    }
  }, [adminUser, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (adminUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border border-border/60 bg-card/95">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Logo size="sm" className="sm:hidden" />
              <Logo size="md" className="hidden sm:block" />
            </div>
            <CardTitle className="text-2xl">Redirecting…</CardTitle>
            <CardDescription>Taking you to the admin dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center py-6">
              <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminLogin({
        email: formData.email,
        password: formData.password,
      })

      toast.success('Successfully signed in as admin.')

      router.replace("/admin")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to sign in with those credentials. Please try again."

      toast.error(message)

      // Reset password field for safety after a failed attempt
      setFormData(prev => ({ ...prev, password: "" }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border/60 bg-card/95">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Logo size="sm" className="sm:hidden" />
            <Logo size="md" className="hidden sm:block" />
          </div>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-2xl">Admin Login</CardTitle>
          </div>
          <CardDescription>
            Sign in to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@stockmento.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={isAuthenticating}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="password-input-container">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                className="pr-12 password-input"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isAuthenticating}
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="password-toggle-btn hover:bg-transparent focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isAuthenticating}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={0}
              >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 cursor-pointer"
              disabled={isAuthenticating}
            >
              {isAuthenticating ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Use the administrator credentials provisioned via the backend seed configuration.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


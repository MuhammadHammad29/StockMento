/**
 * Student auth context.
 * Keeps track of learner login state across the app.
 */
"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { authApi } from "@/lib/api"
import { AuthUser, AuthContextType, LoginCredentials, SignupData, AuthTokens } from "@/lib/types"
import { saveToStorage, loadFromStorage, removeFromStorage, STORAGE_KEYS } from "@/lib/data-utils"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

// Quick check before we poke window/localStorage.
const isBrowser = () => typeof window !== "undefined"

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Save the user + tokens so refreshes stay logged in.
  const storeSession = useCallback((authUser: AuthUser, tokens?: AuthTokens) => {
    setUser(authUser)
    saveToStorage(STORAGE_KEYS.USER, authUser)

    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.SESSION_ROLE, 'student')
      localStorage.removeItem(STORAGE_KEYS.ADMIN_ACCESS_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.ADMIN_USER)

      if (tokens?.accessToken) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken)
        // Note: Refresh token is now stored in HttpOnly cookie by backend
      }
    }
  }, [])

  // Clear everything we cached for the student session.
  const clearSession = useCallback(() => {
    setUser(null)
    removeFromStorage(STORAGE_KEYS.USER)
    removeFromStorage(STORAGE_KEYS.PROGRESS)
    removeFromStorage(STORAGE_KEYS.COURSES)
    removeFromStorage(STORAGE_KEYS.PREFERENCES)

    if (isBrowser()) {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.SESSION_ROLE)
      // Note: Refresh token is in HttpOnly cookie, cleared by backend on logout
    }
  }, [])

  // Try to restore a session when the app bootstraps.
  const restoreSession = useCallback(async () => {
    if (!isBrowser()) {
      setLoading(false)
      return
    }

    const sessionRole = localStorage.getItem(STORAGE_KEYS.SESSION_ROLE)

    if (sessionRole && sessionRole !== 'student') {
      setLoading(false)
      return
    }

    const existingAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)

    if (!existingAccessToken) {
      clearSession()
      setLoading(false)
      return
    }

    try {
      const cachedUser = loadFromStorage<AuthUser>(STORAGE_KEYS.USER)
      if (cachedUser) {
        setUser(cachedUser)
      } else {
        const currentUser = await authApi.me()
        storeSession(currentUser)
      }
    } catch (error) {
      console.error("Failed to restore session:", error)
      clearSession()
    } finally {
      setLoading(false)
    }
  }, [clearSession, storeSession])

  useEffect(() => {
    void restoreSession()
  }, [restoreSession])

  // Sign in with email/password and stash the session.
  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      setLoading(true)
      try {
        const { user: authUser, tokens } = await authApi.userLogin(credentials)
        storeSession(authUser, tokens)
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Unable to sign in. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    [storeSession]
  )

  // Create a new account (finalized via OTP later).
  const signup = useCallback(
    async (data: SignupData): Promise<void> => {
      setLoading(true)
      try {
        await authApi.userRegister({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          avatarId: data.avatarId,
          bio: data.bio,
        })
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Unable to create account. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Send or resend the verification code email.
  const sendVerificationCode = useCallback(async (email: string): Promise<void> => {
    try {
      await authApi.sendVerificationCode({ email })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Failed to send verification code.")
    }
  }, [])

  // Verify the code and immediately sign the user in.
  const verifyEmail = useCallback(
    async (email: string, code: string): Promise<void> => {
      setLoading(true)
      try {
        const { user: authUser, tokens } = await authApi.verifyEmail({ email, code })
        storeSession(authUser, tokens)
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Verification failed. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    [storeSession]
  )

  // Start the forgot password flow.
  const resetPassword = useCallback(async (email: string): Promise<void> => {
    setLoading(true)
    try {
      await authApi.requestPasswordReset({ email })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unable to process password reset request.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Re-fetch the user; drop the session if the token is bad.
  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    if (!isBrowser()) {
      return null
    }

    try {
      const currentUser = await authApi.me()
      storeSession(currentUser)
      return currentUser
    } catch (error) {
      console.error("Failed to refresh session:", error)

      if (error instanceof Error && /401|unauthorized/i.test(error.message)) {
        clearSession()
      }

      return null
    }
  }, [clearSession, storeSession])

  // Try to log out, but always clear local state and redirect.
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout()
    } catch (error) {
      console.warn("Logout request failed:", error)
    } finally {
      clearSession()
      router.push("/signin")
    }
  }, [clearSession, router])

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    verifyEmail,
    sendVerificationCode,
    logout,
    resetPassword,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}




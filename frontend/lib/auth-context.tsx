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

const isBrowser = () => typeof window !== "undefined"

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  /**
   * Persists the authenticated user and any tokens returned by the API.
   */
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

  /**
   * Clears all locally cached auth state and tokens.
   */
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

  /**
   * Runs on app mount to fetch the current user if tokens already exist.
   */
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

  /**
   * Signs in the user and stores the returned session.
   */
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

  /**
   * Starts the signup flow; actual verification completes later.
   */
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

  /**
   * Requests a verification code for the supplied email.
   */
  const sendVerificationCode = useCallback(async (email: string): Promise<void> => {
    try {
      await authApi.sendVerificationCode({ email })
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Failed to send verification code.")
    }
  }, [])

  /**
   * Confirms the OTP and stores the returned auth session.
   */
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

  /**
   * Starts the password reset flow (emails the reset link).
   */
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

  /**
   * Refetches the authenticated user from the API and updates local storage.
   */
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

  /**
   * Logs out the user and redirects to the sign-in screen.
   */
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




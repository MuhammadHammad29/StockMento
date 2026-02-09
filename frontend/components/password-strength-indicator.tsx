"use client"

import { useMemo } from "react"
import { 
  calculatePasswordStrength, 
  getStrengthBarWidth, 
  getStrengthBarColor,
  type PasswordValidationResult 
} from "@/lib/password-utils"
import { CheckCircle2, XCircle } from "lucide-react"

interface PasswordStrengthIndicatorProps {
  password: string
  showRequirements?: boolean
  className?: string
}

/**
 * Real-time password strength indicator with visual feedback
 * Shows strength bar, label, and optional requirements checklist
 */
export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  className = "",
}: PasswordStrengthIndicatorProps) {
  const getInitialValidation = (): PasswordValidationResult => ({
    strength: "weak",
    score: 0,
    feedback: [],
    isValid: false,
    color: "text-muted-foreground",
    label: "Start typing...",
  })

  const validation = useMemo<PasswordValidationResult>(() => {
    if (!password) {
      return getInitialValidation()
    }
    return calculatePasswordStrength(password)
  }, [password])
  const isIndicatorVisible = !password || !validation.isValid

  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[@$!%*?&#^()_+\-=\[\]{};:'",.<>\/\\|`~]/.test(password)
  const hasMinLength = password.length >= 8
  const isNotCommon =
    password.length > 0 &&
    !["password", "password123", "12345678", "123456789", "qwerty", "abc123", "letmein", "welcome", "admin", "admin123", "test123", "user123"].includes(
      password.toLowerCase(),
    )

  return (
    <div className={`space-y-2 ${className}`}>
      {isIndicatorVisible && (
        <>
          {/* Strength Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Password strength</span>
              <span className={`text-xs font-medium ${validation.color}`}>
                {validation.label}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getStrengthBarColor(validation.score)}`}
                style={{ width: getStrengthBarWidth(validation.score) }}
              />
            </div>
          </div>

          {/* Feedback Messages */}
          {validation.feedback.length > 0 && !showRequirements && (
            <div className="space-y-1">
              {validation.feedback.map((message, index) => (
                <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <XCircle className="h-3 w-3 mt-0.5 text-red-500 flex-shrink-0" />
                  <span>{message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Requirements Checklist */}
          {showRequirements && (
            <div className="space-y-2 border border-dashed border-border/60 rounded-md p-3 bg-muted/30">
              <div>
                <h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Password requirements</h4>
                <p className="text-xs text-muted-foreground">Meet all of the following conditions:</p>
              </div>
              <div className="space-y-2">
                <RequirementItem met={hasMinLength} text="At least 8 characters long" />
                <RequirementItem met={hasUppercase} text="At least one uppercase letter (A-Z)" />
                <RequirementItem met={hasLowercase} text="At least one lowercase letter (a-z)" />
                <RequirementItem met={hasNumber} text="At least one number (0-9)" />
                <RequirementItem met={hasSpecial} text="At least one special character (@$!%*?&#, etc.)" />
                <RequirementItem met={isNotCommon} text="Not a commonly used password" />
              </div>
            </div>
          )}
        </>
      )}

      {/* Success Message */}
      {validation.isValid && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-500">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="font-medium">Strong password! All requirements met.</span>
        </div>
      )}
    </div>
  )
}

interface RequirementItemProps {
  met: boolean
  text: string
}

function RequirementItem({ met, text }: RequirementItemProps) {
  return (
    <div className="flex items-start gap-2">
      {met ? (
        <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      )}
      <span className={`text-xs ${met ? 'text-emerald-600 dark:text-emerald-500' : 'text-muted-foreground'}`}>
        {text}
      </span>
    </div>
  )
}

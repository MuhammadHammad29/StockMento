/**
 * Password strength levels
 */
export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong';

/**
 * Password validation result with detailed feedback
 */
export interface PasswordValidationResult {
  strength: PasswordStrength;
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
  color: string;
  label: string;
}

/**
 * Common weak passwords that should be rejected
 */
const COMMON_PASSWORDS = [
  'password',
  'password123',
  '12345678',
  '123456789',
  'qwerty',
  'abc123',
  'letmein',
  'welcome',
  'admin',
  'admin123',
  'test123',
  'user123',
];

/**
 * Calculates the strength of a password based on multiple criteria
 * @param password - The password to validate
 * @returns Detailed validation result with strength score and feedback
 */
export function calculatePasswordStrength(password: string): PasswordValidationResult {
  const feedback: string[] = [];
  let score = 0;

  // Check if password is empty
  if (!password) {
    return {
      strength: 'weak',
      score: 0,
      feedback: ['Password is required'],
      isValid: false,
      color: 'text-gray-400',
      label: 'No password',
    };
  }

  // Check length (minimum 8 characters)
  if (password.length < 8) {
    feedback.push('Must be at least 8 characters');
  } else {
    score++;
    if (password.length >= 12) {
      score++; // Bonus for longer passwords
    }
  }

  // Check maximum length
  if (password.length > 128) {
    feedback.push('Password is too long (max 128 characters)');
    return {
      strength: 'weak',
      score: 0,
      feedback,
      isValid: false,
      color: 'text-red-500',
      label: 'Too long',
    };
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    feedback.push('Add at least one uppercase letter');
  } else {
    score++;
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    feedback.push('Add at least one lowercase letter');
  } else {
    score++;
  }

  // Check for numbers
  if (!/[0-9]/.test(password)) {
    feedback.push('Add at least one number');
  } else {
    score++;
  }

  // Check for special characters
  if (!/[@$!%*?&#^()_+\-=\[\]{};:'",.<>\/\\|`~]/.test(password)) {
    feedback.push('Add at least one special character (@$!%*?&#, etc.)');
  } else {
    score++;
  }

  // Check against common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    feedback.push('This password is too common');
    score = Math.max(0, score - 2); // Penalty for common passwords
  }

  // Determine strength level and validation status
  const isValid = score >= 5 && feedback.length === 0;
  
  let strength: PasswordStrength;
  let color: string;
  let label: string;

  if (score <= 1) {
    strength = 'weak';
    color = 'text-red-500';
    label = 'Weak';
  } else if (score <= 3) {
    strength = 'medium';
    color = 'text-orange-500';
    label = 'Medium';
  } else if (score <= 5) {
    strength = 'strong';
    color = 'text-yellow-500';
    label = 'Strong';
  } else {
    strength = 'very-strong';
    color = 'text-emerald-500';
    label = 'Very Strong';
  }

  return {
    strength,
    score,
    feedback,
    isValid,
    color,
    label,
  };
}

/**
 * Get the progress bar width percentage based on password strength score
 * @param score - Password strength score (0-6)
 * @returns Width percentage string
 */
export function getStrengthBarWidth(score: number): string {
  const percentage = Math.min(100, (score / 6) * 100);
  return `${percentage}%`;
}

/**
 * Get the color class for the strength bar based on score
 * @param score - Password strength score (0-6)
 * @returns Tailwind color class
 */
export function getStrengthBarColor(score: number): string {
  if (score <= 1) return 'bg-red-500';
  if (score <= 3) return 'bg-orange-500';
  if (score <= 5) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

/**
 * Validates if password meets all requirements
 * @param password - The password to validate
 * @returns True if password is valid, false otherwise
 */
export function isPasswordValid(password: string): boolean {
  const result = calculatePasswordStrength(password);
  return result.isValid;
}

/**
 * Gets a user-friendly list of password requirements
 * @returns Array of requirement strings
 */
export function getPasswordRequirements(): string[] {
  return [
    'At least 8 characters long',
    'At least one uppercase letter (A-Z)',
    'At least one lowercase letter (a-z)',
    'At least one number (0-9)',
    'At least one special character (@$!%*?&#, etc.)',
    'Not a common password',
  ];
}

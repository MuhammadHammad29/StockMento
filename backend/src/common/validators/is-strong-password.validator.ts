import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Common weak passwords that should be rejected.
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

@ValidatorConstraint({ async: false })
export class IsStrongPasswordConstraint
  implements ValidatorConstraintInterface
{
  validate(password: string): boolean {
    if (typeof password !== 'string') {
      return false;
    }

    // Check minimum length (8 characters)
    if (password.length < 8) {
      return false;
    }

    // Check maximum length (128 characters - security best practice)
    if (password.length > 128) {
      return false;
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      return false;
    }

    // Check for at least one special character
    if (!/[@$!%*?&#^()_+\-=[\]{};:'",.<>/\\|`~]/.test(password)) {
      return false;
    }

    // Check against common passwords (case-insensitive)
    if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const password = args.value as string;

    if (!password || password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (password.length > 128) {
      return 'Password must not exceed 128 characters';
    }

    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }

    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }

    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }

    if (!/[@$!%*?&#^()_+\-=[\]{};:'",.<>/\\|`~]/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&#, etc.)';
    }

    if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
      return 'This password is too common. Please choose a stronger password';
    }

    return 'Password does not meet security requirements';
  }
}

/**
 * Custom decorator to validate strong passwords.
 *
 * Requirements:
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Not a common password
 *
 * @param validationOptions - Optional validation options
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

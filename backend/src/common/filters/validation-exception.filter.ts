import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Interface for formatted validation error response
 */
interface ValidationErrorResponse {
  statusCode: number;
  message: string;
  errors: Record<string, string[]>;
  timestamp: string;
  path: string;
}

/**
 * Global exception filter to format validation errors consistently.
 * Transforms class-validator errors into a user-friendly format with field-specific messages.
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as
      | string
      | { message?: string | string[] };

    // Check if this is a validation error from class-validator
    if (
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse &&
      Array.isArray(exceptionResponse.message)
    ) {
      const validationErrors = this.formatValidationErrors(
        exceptionResponse.message,
      );

      const errorResponse: ValidationErrorResponse = {
        statusCode: status,
        message: 'Validation failed',
        errors: validationErrors,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      this.logger.warn(
        `Validation failed for ${request.method} ${request.url}: ${JSON.stringify(validationErrors)}`,
      );

      response.status(status).json(errorResponse);
    } else {
      // Not a validation error, return the original exception response
      const errorResponse = {
        statusCode: status,
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as { message?: string }).message ||
              'Bad Request',
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      response.status(status).json(errorResponse);
    }
  }

  /**
   * Formats class-validator error messages into a field-based structure.
   * @param messages - Array of validation error messages from class-validator
   * @returns Object with field names as keys and error messages as values
   */
  private formatValidationErrors(messages: string[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    for (const message of messages) {
      // class-validator returns messages in format: "property validation message"
      // We'll try to parse them, but fallback to a general error if parsing fails
      if (typeof message === 'string') {
        // Add to general errors if we can't determine the field
        if (!errors.general) {
          errors.general = [];
        }
        errors.general.push(message);
      } else if (typeof message === 'object' && 'constraints' in message) {
        // Handle structured validation errors from class-validator
        const field = (message as { property?: string }).property || 'general';
        const constraints = (
          message as { constraints?: Record<string, string> }
        ).constraints;

        if (constraints) {
          if (!errors[field]) {
            errors[field] = [];
          }
          errors[field].push(...Object.values(constraints));
        }
      }
    }

    return errors;
  }
}

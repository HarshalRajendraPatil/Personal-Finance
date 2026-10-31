/**
 * Custom Operational Application Error Classes
 * Used to distinguish trusted, client-facing operational errors (4xx)
 * from unexpected programming/system faults (5xx).
 */

export class AppError extends Error {
  constructor(message, statusCode = 400, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request parameters', errors = null) {
    super(message, 400, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required. Please sign in to continue.') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this financial operation.') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested financial resource or record was not found.') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'A resource with these details already exists.') {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed for the submitted data', errors = null) {
    super(message, 422, errors);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please wait a moment before trying again.') {
    super(message, 429);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Financial service is temporarily unavailable. Please retry shortly.') {
    super(message, 503);
  }
}


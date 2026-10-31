import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.resolve(__dirname, '../logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (e) {
    // ignore
  }
}

/**
 * Sanitizes sensitive fields from request payloads before developer logging
 */
const SENSITIVE_KEYS = ['password', 'confirmPassword', 'token', 'refreshToken', 'credential', 'secret', 'cvv', 'cardNumber', 'pin'];

const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);

  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

/**
 * Appends diagnostic error traces to Server/logs/error.log
 */
const appendErrorLog = (entry) => {
  try {
    const logPath = path.join(logDir, 'error.log');
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  } catch (e) {
    // Silent fail if filesystem write is blocked
  }
};

/**
 * Response interceptor middleware:
 * Intercepts any 5xx responses (whether thrown or sent via res.status(500).json)
 * ensuring developers get deep diagnostic logs while clients receive a unified, reassuring message.
 */
export const serverErrorInterceptor = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    if (res.statusCode >= 500) {
      const errorId = `ERR-CAP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const rawMessage = data?.message || data?.error || 'Unknown internal server error';

      const logEntry = {
        timestamp: new Date().toISOString(),
        errorId,
        statusCode: res.statusCode,
        route: `${req.method} ${req.originalUrl || req.url}`,
        userId: req.user?._id?.toString() || 'unauthenticated',
        userEmail: req.user?.email || null,
        ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'] || null,
        query: req.query || {},
        body: sanitizeData(req.body),
        developerMessage: rawMessage,
        rawError: data?.error || null,
        stack: data?.stack || (new Error(rawMessage)).stack,
      };

      console.error('\n' + '='.repeat(80));
      console.error(`🚨 [CAPISERVER 5XX INTERCEPTED] Reference ID: ${errorId}`);
      console.error(`⏰ Timestamp: ${logEntry.timestamp}`);
      console.error(`🌐 Route: ${logEntry.route}`);
      console.error(`👤 User: ${logEntry.userId} (${logEntry.userEmail || 'guest'})`);
      console.error(`📦 Client IP: ${logEntry.ip}`);
      console.error(`📝 Developer Detail: ${rawMessage}`);
      if (logEntry.stack) {
        console.error(`📚 Stack:\n${logEntry.stack}`);
      }
      console.error('='.repeat(80) + '\n');

      appendErrorLog(logEntry);

      return originalJson({
        status: 'error',
        statusCode: res.statusCode,
        message: 'Our financial servers encountered an unexpected issue while processing your request. Please try again shortly.',
        errorId,
      });
    }

    return originalJson(data);
  };

  next();
};

/**
 * Centralized Enterprise-Grade Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || res.statusCode || 500;
  if (statusCode < 400) statusCode = 500;

  let message = err.message || 'An unexpected error occurred';
  let errors = err.errors || null;

  // 1. Handle Known Database / Middleware Errors (Map to operational 4xx)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource identifier: ${err.value}`;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    const validationDetails = Object.values(err.errors || {}).map((e) => e.message);
    message = validationDetails.length > 0 ? validationDetails.join('. ') : 'Validation failed for request data.';
    errors = err.errors;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'record';
    message = `A ${field} with this value already exists.`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Authentication token is invalid. Please sign in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request payload exceeds allowable size limit. Please upload a smaller file.';
  }

  const isClientError = statusCode >= 400 && statusCode < 500;

  // 2. Generate unique tracking correlation ID for server errors
  const errorId = isClientError
    ? undefined
    : `ERR-CAP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  // 3. Structured Developer Diagnostics (Always detailed for developers)
  const logEntry = {
    timestamp: new Date().toISOString(),
    errorId: errorId || 'CLIENT-4XX',
    statusCode,
    route: `${req.method} ${req.originalUrl || req.url}`,
    userId: req.user?._id?.toString() || 'unauthenticated',
    userEmail: req.user?.email || null,
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent'] || null,
    query: req.query || {},
    body: sanitizeData(req.body),
    errorName: err.name || 'Error',
    developerMessage: err.message,
    stack: err.stack || null,
  };

  if (!isClientError) {
    // Print comprehensive developer trace to server stdout
    console.error('\n' + '='.repeat(80));
    console.error(`🚨 [CAPISERVER 5XX EXCEPTION] Reference ID: ${errorId}`);
    console.error(`⏰ Timestamp: ${logEntry.timestamp}`);
    console.error(`🌐 Endpoint: ${logEntry.route}`);
    console.error(`👤 User: ${logEntry.userId} (${logEntry.userEmail || 'guest'})`);
    console.error(`📦 Client IP: ${logEntry.ip}`);
    console.error(`💥 Cause: ${err.name} - ${err.message}`);
    if (err.stack) {
      console.error(`📚 Stack:\n${err.stack}`);
    }
    console.error('='.repeat(80) + '\n');

    // Persist to log file
    appendErrorLog(logEntry);
  } else {
    // Client-side 4xx error: Log lightweight debug line for developer awareness
    console.warn(`⚠️ [CLIENT 4XX] ${req.method} ${req.originalUrl} (${statusCode}): ${message}`);
  }

  // 4. Formatted Response for End-User
  if (isClientError) {
    // Clear, specific client-facing message
    return res.status(statusCode).json({
      status: 'fail',
      statusCode,
      message,
      errors: errors || undefined,
    });
  }

  // Common sanitized message for internal server errors (never leak raw DB/stack traces to end users)
  return res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: 'Our financial servers encountered an unexpected issue while processing your request. Please try again shortly.',
    errorId,
  });
};

/**
 * 404 Route Not Found Handler
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    statusCode: 404,
    message: `Resource endpoint not found: ${req.method} ${req.originalUrl}`,
  });
};

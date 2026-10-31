/**
 * Universal Error Parser & Normalizer for Capise Web Application.
 * Categorizes errors into:
 * 1. Offline & Network Interruption errors
 * 2. Client-side errors (4xx) - Clear, specific actionable messages
 * 3. Server-side errors (5xx) - Sanitized common messages with developer reference IDs
 */

export const parseApiError = (error, context = 'operation') => {
  // If already parsed
  if (error && error.__isParsedError) {
    return error;
  }

  // Check offline status
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  // 1. Network / Offline Drops
  if (isOffline) {
    return {
      __isParsedError: true,
      message: 'You are currently offline. Please check your internet connection and try again.',
      statusCode: 0,
      isOffline: true,
      isNetworkError: true,
      isServerError: false,
      isClientError: false,
      errorId: null,
    };
  }

  // Axios network error / connection dropped in-flight
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return {
      __isParsedError: true,
      message: `Network connection was lost while processing your ${context}. Please verify your connection before retrying.`,
      statusCode: 0,
      isOffline: false,
      isNetworkError: true,
      isServerError: false,
      isClientError: false,
      errorId: null,
    };
  }

  // Request timeout
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return {
      __isParsedError: true,
      message: 'The server took too long to respond. Please check your connection and try again.',
      statusCode: 408,
      isOffline: false,
      isNetworkError: true,
      isServerError: false,
      isClientError: true,
      errorId: null,
    };
  }

  const response = error?.response;
  const status = response?.status || error?.statusCode || 500;
  const data = response?.data;

  // 2. Client-Side Errors (4xx) -> Clear, specific messages
  if (status >= 400 && status < 500) {
    let clientMessage = data?.message || error?.message || 'Invalid request';

    // Handle Mongoose / Joi field errors if present
    const fieldErrors = data?.errors || null;
    if (fieldErrors && typeof fieldErrors === 'object' && !Array.isArray(fieldErrors)) {
      const firstFieldErr = Object.values(fieldErrors)[0];
      if (firstFieldErr?.message) {
        clientMessage = firstFieldErr.message;
      }
    }

    if (status === 401) {
      clientMessage = data?.message || 'Your session has expired. Please sign in again.';
    } else if (status === 403) {
      clientMessage = data?.message || 'You do not have permission to perform this financial operation.';
    } else if (status === 404) {
      clientMessage = data?.message || 'The requested financial resource was not found.';
    } else if (status === 429) {
      clientMessage = 'Too many requests. Please wait a moment before trying again.';
    }

    return {
      __isParsedError: true,
      message: clientMessage,
      statusCode: status,
      isOffline: false,
      isNetworkError: false,
      isServerError: false,
      isClientError: true,
      errorId: null,
      fieldErrors,
    };
  }

  // 3. Server-Side Errors (5xx) -> Common sanitized message + developer reference ID
  const errorId = data?.errorId || null;
  const fallbackServerMsg = errorId
    ? `Our financial servers encountered an unexpected issue. Please try again shortly. (Ref: ${errorId})`
    : 'Our financial servers encountered a temporary issue. Please try again shortly.';

  return {
    __isParsedError: true,
    message: data?.message && data.message !== 'Internal Server Error' && !data.message.includes('Mongo')
      ? data.message
      : fallbackServerMsg,
    statusCode: status,
    isOffline: false,
    isNetworkError: false,
    isServerError: true,
    isClientError: false,
    errorId,
    developerDetail: data?.developerMessage || null,
  };
};

/**
 * Extracts a concise displayable error message string from any caught error.
 */
export const formatErrorMessage = (error, defaultMsg = 'An unexpected error occurred') => {
  if (!error) return defaultMsg;
  if (typeof error === 'string') return error;
  const parsed = parseApiError(error);
  return parsed.message || defaultMsg;
};


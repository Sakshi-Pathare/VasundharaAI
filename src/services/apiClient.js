/**
 * Vasundhara AI — Enterprise API Client
 * 
 * Provides centralized HTTP communication to the FastAPI backend with:
 * - Configurable base URL and request timeouts
 * - Automatic Bearer token authentication header injection
 * - Multipart/form-data and JSON payload serialization
 * - Structured ApiError wrapping with network/timeout/auth classification
 * - 401 session expiration event dispatching
 * - Strict production rule: Mock fallback is NEVER silently served in production
 */

const STORAGE_KEY_TOKEN = 'vasundhara_auth_token_v2';
const DEFAULT_TIMEOUT_MS = 15000;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Strict mock toggle: strictly disabled by default; enabled ONLY when explicitly configured in dev mode
const IS_DEV = Boolean(import.meta.env.DEV);
const ENABLE_DEV_MOCK = IS_DEV && import.meta.env.VITE_ENABLE_MOCK === 'true';

/**
 * Structured API Error containing HTTP status, payload, and classification flags.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, data = null, isNetwork = false, isTimeout = false } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isNetwork = isNetwork;
    this.isTimeout = isTimeout;
    this.isAuth = status === 401;
    this.isForbidden = status === 403;
    this.isNotFound = status === 404;
    this.isValidationError = status === 422;
  }
}

/**
 * Retrieves the current authentication token from storage.
 */
export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem(STORAGE_KEY_TOKEN) ||
    sessionStorage.getItem(STORAGE_KEY_TOKEN)
  );
}

/**
 * Sets the active authentication token in localStorage (or sessionStorage).
 */
export function setAuthToken(token, persistent = true) {
  if (typeof window === 'undefined') return;
  if (!token) {
    clearAuthToken();
    return;
  }
  if (persistent) {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
  } else {
    sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }
}

/**
 * Clears the active authentication token.
 */
export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  sessionStorage.removeItem(STORAGE_KEY_TOKEN);
}

/**
 * Returns the Authorization header dictionary if a token is present.
 */
export function getAuthHeader() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Resolves static asset URLs (e.g. uploaded photos) against origin or relative proxy.
 */
export function resolveAssetUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // If running directly with an external API host defined
  const externalOrigin = import.meta.env.VITE_API_ORIGIN;
  if (externalOrigin && url.startsWith('/static/')) {
    return `${externalOrigin.replace(/\/$/, '')}${url}`;
  }
  return url;
}

/**
 * Core centralized request dispatcher.
 *
 * @param {string} endpoint - Path relative to API_BASE_URL (or full URL)
 * @param {object} options - Fetch options including method, headers, body, timeoutMs, responseType, signal
 * @returns {Promise<any>}
 */
export async function request(endpoint, options = {}) {
  // If explicitly enabled development mock is active
  if (ENABLE_DEV_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return getDevMockResponse(endpoint, options);
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const timeoutMs =
    options.timeoutMs ??
    (Number(import.meta.env.VITE_API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);

  // Set up AbortController for timeouts and caller cancellation
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  // Link external signal if provided
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  // Header preparation
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  let body = options.body;

  // Handle multipart/form-data vs JSON payload serialization
  if (body instanceof FormData) {
    // Delete Content-Type to let browser set boundary parameter automatically
    delete headers['Content-Type'];
  } else if (
    body !== undefined &&
    body !== null &&
    typeof body === 'object' &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  ) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 204 No Content
    if (response.status === 204) {
      return null;
    }

    // Handle HTTP error responses
    if (!response.ok) {
      let errorData = null;
      let errorMessage = `Request failed with status ${response.status}`;

      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          errorData = await response.json();
          if (errorData) {
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
              // FastAPI Pydantic validation error list
              errorMessage = errorData.detail
                .map((err) => `${err.loc?.slice(1).join('.') || 'field'}: ${err.msg}`)
                .join(', ');
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          }
        } else {
          const text = await response.text();
          if (text) errorMessage = text;
        }
      } catch {
        // Fall back to default status message
      }

      // Handle 401 Unauthorized
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vasundhara:unauthorized', { detail: { endpoint, status: 401 } }));
        }
      }

      throw new ApiError(errorMessage, {
        status: response.status,
        data: errorData,
      });
    }

    // Response parsing based on requested type or response content-type
    if (options.responseType === 'blob') {
      return await response.blob();
    }
    if (options.responseType === 'text') {
      return await response.text();
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (timedOut) {
      throw new ApiError(
        `Request to ${endpoint} timed out after ${timeoutMs}ms. Please verify the backend server is responding.`,
        { isTimeout: true, status: 0 }
      );
    }

    if (error.name === 'AbortError') {
      throw new ApiError('Request was aborted.', { status: 0 });
    }

    // Network disconnection / server unreachable
    throw new ApiError(
      `Network connection failed. Unable to reach Vasundhara AI backend at ${url}. Please verify the server is running on port 8001.`,
      { isNetwork: true, status: 0 }
    );
  }
}

/**
 * Convenient REST verb helper wrappers
 */
export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
  upload: (endpoint, formData, options = {}) => request(endpoint, { ...options, method: 'POST', body: formData }),
};

/**
 * Explicit development-only fixtures. Never invoked in production or when VITE_ENABLE_MOCK is false.
 */
function getDevMockResponse(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();

  if (endpoint.includes('/health')) {
    return { status: 'ok', service: 'vasundhara-ai-api-mock', database: 'connected' };
  }
  if (endpoint.includes('/municipalities') && method === 'GET') {
    return [
      { id: 'MUN-01', code: 'PMC', name: 'Pune Municipal Corporation', boundarySource: 'Local GIS', boundaryAvailable: true, active: true },
      { id: 'MUN-02', code: 'PCMC', name: 'Pimpri-Chinchwad Municipal Corporation', boundarySource: 'Local GIS', boundaryAvailable: true, active: true },
    ];
  }
  if (endpoint.includes('/reports/pending-jurisdiction')) return [];
  if (endpoint.includes('/audit')) return [];
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    return { success: true, message: 'Mock mutation completed' };
  }
  return [];
}

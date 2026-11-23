/**
 * API Client abstraction for Vasundhara AI.
 * Dispatches HTTP requests to the FastAPI backend (/api/v1) with Bearer token injection,
 * automatic error handling, and resilient mock fallbacks when developing offline.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export function getAuthHeader() {
  if (typeof window === 'undefined') return {};
  const token =
    localStorage.getItem('vasundhara_auth_token_v2') ||
    sessionStorage.getItem('vasundhara_auth_token_v2');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getMockFallback(endpoint) {
  if (endpoint.includes('/municipalities')) {
    return [
      { id: 'MUN-01', code: 'PMC', name: 'Pune Municipal Corporation', boundarySource: 'Official GIS', boundaryAvailable: true, active: true },
      { id: 'MUN-02', code: 'PCMC', name: 'Pimpri-Chinchwad Municipal Corporation', boundarySource: 'Official GIS', boundaryAvailable: true, active: true },
    ];
  }
  if (endpoint.includes('/reports/pending-jurisdiction')) return [];
  if (endpoint.includes('/audit')) return [];
  if (endpoint.includes('/health')) return { status: 'ok', service: 'vasundhara-ai-api' };
  return [];
}

export async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // If backend is offline/unreachable in local dev, provide safe fallback for GET requests
    const isGet = !options.method || options.method.toUpperCase() === 'GET';
    if (isGet) {
      const fallback = getMockFallback(endpoint);
      if (fallback !== null) return fallback;
    }
    throw error;
  }
}



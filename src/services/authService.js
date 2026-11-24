/**
 * Vasundhara AI — Authentication & Steward Identity Service
 * Connects directly to FastAPI backend (/api/v1/auth) with persistent session tokens.
 */

import { api, clearAuthToken, getAuthToken, setAuthToken } from './apiClient.js';

const STORAGE_KEY_USER = 'vasundhara_current_user_v2';

export const DEMO_PROFILES = {
  citizen: {
    id: 'USR-CITIZEN-01',
    name: 'Alex Morgan',
    email: 'alex.steward@vasundhara.eco',
    password: 'Password123!',
    phone: '+91 98230 45678',
    role: 'citizen',
    roleLabel: 'Citizen Steward',
    badge: 'Level 2 Eco Steward',
    municipalityName: 'Pune Municipal Corporation',
  },
  municipal_admin: {
    id: 'USR-OFFICER-02',
    name: 'Officer Rajesh Sharma',
    email: 'r.sharma@pune.gov.in',
    password: 'Password123!',
    phone: '+91 94220 12345',
    role: 'municipal_admin',
    roleLabel: 'Municipal Sanitation Officer',
    municipalityId: 'MUN-PMC-01',
    municipalityCode: 'PMC',
    municipalityName: 'Pune Municipal Corporation (PMC)',
    badge: 'Municipal Command Lead',
  },
  super_admin: {
    id: 'USR-SUPERADMIN-03',
    name: 'Dr. Ananya Roy',
    email: 'admin@vasundhara.eco',
    password: 'Password123!',
    phone: '+91 99880 99880',
    role: 'super_admin',
    roleLabel: 'System Super Administrator',
    badge: 'Platform Governor',
    permissions: ['*'],
  },
};

function enrichUser(user) {
  if (!user) return null;
  const role = user.role || 'citizen';
  const roleLabels = {
    citizen: 'Citizen Steward',
    municipal_admin: 'Municipal Sanitation Officer',
    super_admin: 'System Super Administrator',
  };
  const badges = {
    citizen: 'Level 2 Eco Steward',
    municipal_admin: 'Municipal Command Lead',
    super_admin: 'Platform Governor',
  };

  return {
    ...user,
    roleLabel: roleLabels[role] || 'Eco Volunteer',
    badge: badges[role] || 'Active Steward',
    karmaScore: user.karmaScore || (role === 'citizen' ? 420 : 1500),
  };
}

export const authService = {
  /**
   * Retrieves current authenticated user from backend session.
   */
  async getCurrentUser() {
    const token = getAuthToken();
    if (!token) {
      localStorage.removeItem(STORAGE_KEY_USER);
      return null;
    }

    try {
      const user = await api.get('/auth/me');
      const enriched = enrichUser(user);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(enriched));
      return enriched;
    } catch (error) {
      if (error.isAuth) {
        clearAuthToken();
        localStorage.removeItem(STORAGE_KEY_USER);
        return null;
      }
      // If temporary network failure, return cached profile to prevent layout jarring
      try {
        const cached = localStorage.getItem(STORAGE_KEY_USER);
        if (cached) return JSON.parse(cached);
      } catch {}
      return null;
    }
  },

  /**
   * Logs in via FastAPI backend /api/v1/auth/login.
   */
  async login(email, password, remember = true) {
    const response = await api.post('/auth/login', {
      email: (email || '').trim().toLowerCase(),
      password,
    });

    const { accessToken, user } = response;
    setAuthToken(accessToken, remember);

    const enriched = enrichUser(user);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(enriched));
    return enriched;
  },

  /**
   * Registers a new user via FastAPI backend /api/v1/auth/register.
   */
  async register(data, remember = true) {
    const response = await api.post('/auth/register', {
      name: data.name,
      email: data.email.trim().toLowerCase(),
      phone: data.phone || null,
      password: data.password,
    });

    const { accessToken, user } = response;
    setAuthToken(accessToken, remember);

    const enriched = enrichUser(user);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(enriched));
    return enriched;
  },

  /**
   * Performs quick login using pre-seeded backend demo accounts.
   */
  async loginDemo(roleKey = 'citizen') {
    const profile = DEMO_PROFILES[roleKey] || DEMO_PROFILES.citizen;
    return this.login(profile.email, profile.password, true);
  },

  /**
   * Logs out user and destroys backend session.
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthToken();
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  },

  /**
   * Password reset request stub.
   */
  async requestPasswordReset(email) {
    await new Promise((r) => setTimeout(r, 200));
    return {
      success: true,
      message: `Password reset instructions sent to ${email} if registered.`,
    };
  },
};

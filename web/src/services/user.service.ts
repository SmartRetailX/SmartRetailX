import { authClient } from '@/lib/auth-client';
import { mapSession } from '@/mappers';
import { fullSessionResponseSchema, SignInSchema, SignUpSchema, TwoFactorSchema } from '@/schemas';
import { ProfileUpdateSchema } from '@/schemas/user.schema';
import { validateAndMap } from '@/utils/service-response-handler';

import { apiClient } from './api-client';

export const userService = {
  // Sign In
  async signIn(data: SignInSchema) {
    const result = await authClient.signIn.email({
      email: data.email,
      password: data.password,
      rememberMe: data.rememberMe,
      callbackURL: '/',
    });

    return result;
  },

  // Sign Up
  async signUp(data: SignUpSchema) {
    const result = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
      callbackURL: '/',
    });

    return result;
  },

  // Get Session
  async getSession() {
    const result = await authClient.getSession();
    return validateAndMap(result.data, fullSessionResponseSchema, mapSession);
  },

  // Sign Out
  async signOut() {
    const result = await authClient.signOut();
    return result;
  },

  // Verify Two-Factor OTP
  async verifyTwoFactorOtp(code: TwoFactorSchema) {
    const result = await apiClient.post('/api/auth/two-factor/verify-otp', {
      code: code.code,
      trustDevice: false,
    });
    return result;
  },

  async verifyTwoFactorTotp(code: string) {
    const result = await apiClient.post('/api/auth/two-factor/verify-totp', {
      code,
      trustDevice: false,
    });
    return result;
  },

  async enableTwoFactor(data: { password: string; issuer?: string | null }) {
    const result = await apiClient.post('/api/auth/two-factor/enable', {
      password: data.password,
      issuer: data.issuer ?? null,
    });
    return result;
  },

  async disableTwoFactor(password: string) {
    const result = await apiClient.post('/api/auth/two-factor/disable', { password });
    return result;
  },

  async revokeAllSessions() {
    const result = await apiClient.post('/api/auth/revoke-sessions', {});
    return result;
  },

  async requestPasswordReset(data: { email: string; redirectTo?: string | null }) {
    const result = await apiClient.post('/api/auth/request-password-reset', {
      email: data.email,
      redirectTo: data.redirectTo ?? null,
    });
    return result;
  },

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  }) {
    const result = await apiClient.post('/api/auth/change-password', {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
      revokeOtherSessions: data.revokeOtherSessions ?? true,
    });
    return result;
  },

  // Update User Profile
  async updateUserProfile(data: Partial<ProfileUpdateSchema>) {
    const updates: Promise<unknown>[] = [];

    const imageUrl = typeof data.image === 'string' ? data.image : undefined;

    if (data.name !== undefined || imageUrl !== undefined) {
      updates.push(
        apiClient.post('/api/auth/update-user', {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(imageUrl !== undefined ? { image: imageUrl } : {}),
        }),
      );
    }

    if (data.email !== undefined) {
      updates.push(
        apiClient.post('/api/auth/change-email', {
          newEmail: data.email,
          callbackURL: typeof window !== 'undefined' ? window.location.origin : null,
        }),
      );
    }

    const results = await Promise.all(updates);
    return {
      updated: true,
      results,
    };
  },
};

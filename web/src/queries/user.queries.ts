import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { SignInSchema, SignUpSchema, TwoFactorSchema } from '@/schemas/auth/auth.schema';
import { ProfileUpdateSchema } from '@/schemas/user.schema';
import { userService } from '@/services/user.service';

import { authKeys, userKeys } from './query-keys';

export const useSignIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignInSchema) => userService.signIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
    onError: (error: Error) => {
      throw new Error(error.message || 'Sign in failed');
    },
  });
};

export const useSignUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignUpSchema) => userService.signUp(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
    onError: (error: Error) => {
      throw new Error(error.message || 'Sign up failed');
    },
  });
};

export const useGetSession = () => {
  return useQuery({
    queryKey: authKeys.details(),
    queryFn: () => userService.getSession(),
  });
};

export const useSignOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => userService.signOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};

export const useVerifyTwoFactorOtp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TwoFactorSchema) => userService.verifyTwoFactorOtp(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};

export const useVerifyTwoFactorTotp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { code: string }) => userService.verifyTwoFactorTotp(data.code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};

export const useEnableTwoFactor = () => {
  return useMutation({
    mutationFn: (data: { password: string; issuer?: string | null }) =>
      userService.enableTwoFactor(data),
  });
};

export const useDisableTwoFactor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { password: string }) => userService.disableTwoFactor(data.password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};

export const useRevokeAllSessions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => userService.revokeAllSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};

export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: (data: { email: string; redirectTo?: string | null }) =>
      userService.requestPasswordReset(data),
  });
};

export const useChangePassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      currentPassword: string;
      newPassword: string;
      revokeOtherSessions?: boolean;
    }) => userService.changePassword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
};

// ! Recheck service methods and fix the logic
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ProfileUpdateSchema) => {
      return userService.updateUserProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};

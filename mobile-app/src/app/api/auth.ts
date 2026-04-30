import { api } from './client';
import type { SessionResponse } from '../types/api';

export async function signInEmail(email: string, password: string) {
  const { data } = await api.post<SessionResponse>('/api/auth/sign-in/email', {
    email,
    password,
  });
  return data;
}

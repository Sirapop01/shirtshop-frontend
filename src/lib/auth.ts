import api from './api';
import type { AuthResponse, LoginPayload, RegisterPayload } from '@/types/auth';
import { useAuthStore } from '@/store/auth';

export async function login(payload: LoginPayload) {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  useAuthStore.getState().setAuth(data.user, data.accessToken);
  // ถ้า backend ส่ง refresh เป็น cookie httpOnly จะไม่มี refreshToken ใน response
  return data.user;
}

export async function register(payload: RegisterPayload) {
  // ส่งเป็น JSON (มาตรฐาน REST ของ Spring @RequestBody)
  const { data } = await api.post('/auth/register', payload);

  // ถ้า BE ส่ง token + user มา -> setAuth ให้เลย
  if ((data as AuthResponse)?.accessToken && (data as AuthResponse)?.user) {
    const d = data as AuthResponse;
    useAuthStore.getState().setAuth(d.user, d.accessToken);
    return { autoLoggedIn: true, user: d.user, message: 'ok' };
  }

  // กรณี BE ไม่ส่ง token (เช่น: แค่สร้างผู้ใช้สำเร็จ)
  return { autoLoggedIn: false, user: null, message: data?.message ?? 'registered' };
}

export async function logout() {
  try {
    await api.post('/auth/logout'); 
  } finally {
    useAuthStore.getState().clearAuth();
  }
}

export async function requestPasswordOtp(email: string) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPasswordWithOtp(email: string, otp: string, newPassword: string) {
  const { data } = await api.post('/auth/reset-password', { email, otp, newPassword });
  return data;
}

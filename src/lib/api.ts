import axios from 'axios';
import { useAuthStore } from '@/store/auth';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE,
  withCredentials: true, // เผื่อ backend ใช้ cookie httpOnly สำหรับ refresh
});

// NOTE: อ่าน token จาก store ทุกครั้ง (หลีกเลี่ยง stale)
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v?: unknown) => void; reject: (e?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error?.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              if (token) {
                original.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(original));
            },
            reject,
          });
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        // เรียก refresh token endpoint
        const refreshRes = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE}/auth/refresh`,
          {}, // ถ้า refresh ใช้ cookie httpOnly ก็ไม่ต้องส่ง body
          { withCredentials: true }
        );
        const newAccess = refreshRes.data?.accessToken as string;
        if (newAccess) {
          useAuthStore.getState().setAuth(
            useAuthStore.getState().user!,
            newAccess
          );
          original.headers.Authorization = `Bearer ${newAccess}`;
          processQueue(null, newAccess);
          return api(original);
        }
        processQueue(new Error('No access token from refresh'));
        return Promise.reject(error);
      } catch (err) {
        processQueue(err as any, null);
        useAuthStore.getState().clearAuth();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

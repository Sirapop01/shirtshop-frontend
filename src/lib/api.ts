// api.ts

import axios, { AxiosError } from "axios";

// สมมติว่าคุณมี state management (Zustand, Redux, or Context)
// ที่สามารถเข้าถึงได้จากภายนอก Component
import { useAuthStore } from "@/store/auth";

// --- Helper Functions (คุณอาจจะต้องสร้างไฟล์นี้แยก) ---
// ฟังก์ชันสำหรับอ่าน/เขียน token จาก storage โดยตรง
const getRefreshToken = (): string | null => {
  return localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
};

const getAccessToken = (): string | null => {
  return localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
};

const saveTokens = (accessToken: string, refreshToken?: string | null) => {
  const isRemembered = !!localStorage.getItem("refreshToken");
  if (isRemembered) {
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  } else {
    sessionStorage.setItem("accessToken", accessToken);
    if (refreshToken) sessionStorage.setItem("refreshToken", refreshToken);
  }
}
// --------------------------------------------------------


const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  withCredentials: false,
});

// Interceptor: ก่อนส่ง Request (แนบบัตรผ่าน)
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// ✨ --- Interceptor: หลังได้รับ Response (จัดการเมื่อบัตรผ่านหมดอายุ) --- ✨
api.interceptors.response.use(
  (response) => {
    // ถ้า Response สำเร็จ (status 2xx) ก็ส่งต่อไปเลย ไม่ต้องทำอะไร
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // ตรวจสอบว่าเป็น Error 401 (Unauthorized) และยังไม่ได้ลอง retry มาก่อน
    if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
      (originalRequest as any)._retry = true; // ตั้งธงว่ากำลังจะ retry แล้วนะ (กันลูปนรก)

      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          // ถ้าไม่มี refresh token ก็หมดหวัง -> logout
          useAuthStore.getState().clearAuth();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        console.log("Access token expired. Refreshing token...");

        // เรียก API เพื่อขอ Access Token ใหม่โดยตรง (ไม่ผ่าน interceptor นี้)
        const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
          refreshToken: refreshToken,
        });

        const { accessToken, user, refreshToken: newRefreshToken } = data;

        // บันทึก Token และ User ใหม่ลง State และ Storage
        useAuthStore.getState().setAuth(user, accessToken);
        saveTokens(accessToken, newRefreshToken);

        console.log("Token refreshed successfully. Retrying original request...");

        // อัปเดต Header ของ request เดิมด้วย Token ใหม่
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        // ส่ง request เดิมซ้ำอีกครั้งด้วย instance `api` หลัก
        return api(originalRequest);

      } catch (refreshError) {
        // ถ้าการ Refresh ก็ล้มเหลว (เช่น refresh token หมดอายุ/ไม่ถูกต้อง) -> logout
        console.error("Refresh token failed. Logging out.", refreshError);
        useAuthStore.getState().clearAuth();
        window.location.href = '/login?session=expired'; // บังคับไปหน้า login พร้อมบอกเหตุผล
        return Promise.reject(refreshError);
      }
    }

    // ถ้าเป็น Error อื่นที่ไม่ใช่ 401 ก็ส่ง Error ต่อไปตามปกติ
    return Promise.reject(error);
  }
);

export default api;
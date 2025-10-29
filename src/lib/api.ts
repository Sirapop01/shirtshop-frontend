// src/lib/api.ts


import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// ---- Base URL (trim trailing slashes to avoid double //) ----
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

// ---- Token keys & helpers ----
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return (
      sessionStorage.getItem(ACCESS_TOKEN_KEY) ??
      localStorage.getItem(ACCESS_TOKEN_KEY)
  );
};

export const setAccessToken = (
    token: string,
    persist: "session" | "local" = "session"
) => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  if (persist === "local") localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const setRefreshToken = (
    token: string,
    persist: "session" | "local" = "session"
) => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  if (persist === "local") localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const clearTokens = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// ---- Axios instance ----
const api = axios.create({
  baseURL: API_BASE, // ex: https://host.tld  OR  https://host.tld/api
  timeout: 30_000,
  withCredentials: false, // flip to true if your BE uses cookie auth
});

// ---- Request: attach Authorization if token exists ----
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  // ✅ สำคัญ: ถ้าเป็น FormData ห้ามตั้ง Content-Type เอง
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;
  if (isFormData && config.headers) {
    delete (config.headers as any)["Content-Type"];
    delete (config.headers as any)["content-type"];
  }
  return config;
});


// ---- Response: basic error passthrough (customize as needed) ----
api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      return Promise.reject(error);
    }
);

// ---- Tiny helper to build absolute URLs (useful for <img src=...>) ----
export const buildUrl = (path = ""): string => {
  if (!path) return API_BASE;
  // ถ้าเป็น absolute / data: / blob: ให้คืนค่าเดิมเลย ไม่ต้องต่อ BASE
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
};

export default api;

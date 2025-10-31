// src/lib/auth.ts
import api, {
  setAccessToken,
  setRefreshToken,
  clearTokens,
  getAccessToken,
} from "@/lib/api";

/** ---------- Types ---------- */
export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  roles?: string[];
};

export type LoginReq = { email: string; password: string; remember?: boolean };
export type RegisterReq = { email: string; password: string; name?: string };

export type Tokens = {
  accessToken: string;
  refreshToken?: string;
};

export type AuthPayload = {
  user: AuthUser;
  tokens: Tokens;
};

/** Login + เก็บโทเคน */
export async function login(body: LoginReq): Promise<AuthPayload> {
  const { data } = await api.post<AuthPayload>("/api/auth/login", body);
  // persist = local ถ้า remember, ไม่งั้น session
  const persist = body.remember ? "local" : "session";
  setAccessToken(data.tokens.accessToken, persist);
  if (data.tokens.refreshToken) setRefreshToken(data.tokens.refreshToken, persist);
  return data;
}

/** Register (สมัคร + อาจจะล็อกอินอัตโนมัติขึ้นกับ BE) */
export async function register(body: RegisterReq): Promise<AuthPayload> {
  const { data } = await api.post<AuthPayload>("/api/auth/register", body);
  // บางระบบคืนโทเคน บางระบบไม่—เช็คก่อน
  if (data?.tokens?.accessToken) {
    setAccessToken(data.tokens.accessToken, "session");
    if (data.tokens.refreshToken) setRefreshToken(data.tokens.refreshToken, "session");
  }
  return data;
}

/** ดึงข้อมูลผู้ใช้ปัจจุบัน */
export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>("/api/auth/me");
  return data;
}

export async function requestPasswordOtp(email: string): Promise<void> {
  await api.post("/api/auth/password/otp", { email });
}

/** รีเซ็ตรหัสผ่านด้วย OTP (สอดคล้องกับ BE) */
export async function resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
  await api.post("/api/auth/password/reset", { email, otp, newPassword });
}

export async function changePassword(params: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  // ปรับ path ให้ตรงกับ BE ของคุณ ถ้าใช้ตัวอย่างนี้จะเป็น /api/auth/password/change (PUT)
  const { data } = await api.put<{ message: string }>(
      "/api/auth/password/change",
      params
  );
  return data;
}


/** (ถ้ามี) รีเฟรชโทเคน */
export async function refreshTokens(): Promise<Tokens | null> {
  // ตัวอย่าง: เรียกเมื่อ 401 หรือก่อนหมดอายุ (คุณอาจย้าย logic ไปที่ interceptor ก็ได้)
  try {
    const { data } = await api.post<Tokens>("/api/auth/refresh");
    setAccessToken(data.accessToken, "session");
    if (data.refreshToken) setRefreshToken(data.refreshToken, "session");
    return data;
  } catch {
    return null;
  }
}

/** ล็อกเอาต์ (ถ้า BE รองรับ endpoint) */
export async function logout(): Promise<void> {
  try {
    if (getAccessToken()) {
      await api.post("/api/auth/logout");
    }
  } finally {
    clearTokens();
  }
}

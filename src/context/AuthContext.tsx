"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { jwtDecode } from "jwt-decode";

// ---------------------- Type Definitions ----------------------
export interface UserResponse {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  profileImageUrl: string;
  emailVerified: boolean;
  roles: string[]; // backend อาจส่งเป็น ['ROLE_ADMIN'] หรือ ['ADMIN']
}

// อนุโลม fields อื่นๆ ที่แบ็กเอนด์อาจใช้ เช่น authorities/scope
interface DecodedToken {
  sub?: string;
  roles?: string[];        // บางระบบใช้ roles
  authorities?: string[];  // บางระบบใช้ authorities
  scope?: string;          // บางระบบใช้ "read write admin" (string เดียว)
  exp?: number;            // Expiration time (seconds)
}

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  login: (accessToken: string, refreshToken: string | null, userResponse: UserResponse, remember: boolean) => void;
  logout: () => void;
  isAdmin: boolean;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------- Helpers ----------------------
// แปลงรูปแบบ roles ให้เป็นรูปแบบมาตรฐาน (ตัด ROLE_ ออก และ uppercase)
function extractRoles(input: unknown): string[] {
  if (!input) return [];
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/\s+/) // สำหรับ scope: "read write admin"
      : [];

  return raw
    .map((r) => String(r).trim())
    .filter(Boolean)
    .map((r) => r.toUpperCase())
    .map((r) => r.replace(/^ROLE_/, "")); // "ROLE_ADMIN" => "ADMIN"
}

function isAdminFromClaims(decoded: DecodedToken | any): boolean {
  const roles = extractRoles(decoded?.roles ?? decoded?.authorities ?? decoded?.scope);
  return roles.includes("ADMIN");
}

function isAdminFromUser(userLike: any): boolean {
  const roles = extractRoles(userLike?.roles ?? userLike?.authorities ?? userLike?.permissions);
  return roles.includes("ADMIN");
}

// ---------------------- Provider ----------------------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState(true); // เริ่มต้นเป็น true

  // logout ใช้ useCallback เพื่อไม่สร้างใหม่ทุก re-render
  const logout = useCallback(() => {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      sessionStorage.removeItem("refreshToken");
    } catch {}
    setUser(null);
    setToken(null);
    setIsAdmin(false);
  }, []);

  // login ใช้ useCallback เช่นกัน
  const login = useCallback(
    (accessToken: string, refreshToken: string | null, userResponse: UserResponse, remember: boolean) => {
      try {
        const decoded: DecodedToken = jwtDecode(accessToken);

        // จัดการเก็บ token
        localStorage.setItem("accessToken", accessToken);

        // เคลียร์ refresh เดิมก่อน
        localStorage.removeItem("refreshToken");
        sessionStorage.removeItem("refreshToken");

        if (refreshToken) {
          if (remember) {
            localStorage.setItem("refreshToken", refreshToken);
          } else {
            sessionStorage.setItem("refreshToken", refreshToken);
          }
        }

        setToken(accessToken);
        setUser(userResponse);
        setIsAdmin(isAdminFromClaims(decoded) || isAdminFromUser(userResponse));
      } catch (error) {
        console.error("ประมวลผล Token ตอน Login ไม่สำเร็จ:", error);
        logout();
      }
    },
    [logout]
  );

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem("accessToken");
        if (!storedToken) {
          setAuthLoading(false);
          return;
        }

        // ลอง decode token ที่มี
        let decoded: DecodedToken | null = null;
        try {
          decoded = jwtDecode(storedToken);
        } catch (e) {
          console.warn("Decode access token ไม่สำเร็จ:", e);
        }

        // ถ้ามี exp และหมดอายุแล้ว -> refresh
        if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
          await handleTokenRefresh();
          return;
        }

        // ยังไม่หมดอายุ -> ตั้งค่าเบื้องต้น แล้วดึง /me อัปเดต user+role ให้ชัวร์
        setToken(storedToken);
        setIsAdmin(isAdminFromClaims(decoded ?? {}));
        await fetchCurrentUser(storedToken);
      } catch (error) {
        console.error("AuthContext: Initialization error:", error);
        logout();
      } finally {
        setAuthLoading(false);
      }
    };

    const handleTokenRefresh = async () => {
      const refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
      if (!refreshToken) {
        logout();
        return;
      }

      try {
        const res = await fetch("http://localhost:8080/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          logout();
          return;
        }

        const data = await res.json();
        const remembered = !!localStorage.getItem("refreshToken"); // เคย rememberMe ไหม
        // สมมุติ backend ส่งกลับ { accessToken, refreshToken, user }
        login(data.accessToken, data.refreshToken, data.user, remembered);
      } catch (error) {
        console.error("ไม่สามารถ Refresh Token ได้:", error);
        logout();
      }
    };

    const fetchCurrentUser = async (currentToken: string) => {
      try {
        const res = await fetch("http://localhost:8080/api/auth/me", {
          headers: { Authorization: `Bearer ${currentToken}` },
        });

        if (res.status === 401 || res.status === 403) {
          // โทเค็นอาจหมดอายุ ลองรีเฟรช
          await handleTokenRefresh();
          return;
        }

        if (!res.ok) {
          console.error("Fetch /me failed with status:", res.status);
          logout();
          return;
        }

        const userData: UserResponse = await res.json();
        setUser(userData);
        setIsAdmin(isAdminFromUser(userData));
      } catch (error) {
        console.error("ไม่สามารถดึงข้อมูลผู้ใช้ปัจจุบันได้:", error);
        logout();
      }
    };

    initializeAuth();
  }, [login, logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------- Hook ----------------------
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { jwtDecode } from "jwt-decode";
import api from "@/lib/api";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_LS_KEY = "refreshToken"; // remember me
const REFRESH_TOKEN_SS_KEY = "refreshToken"; // session
const AUTH_BUNDLE_KEY = "shirtshop_auth";
const AUTH_COOKIE_NAME = "auth_token";

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
  roles: string[];
}

interface DecodedToken {
  sub?: string;
  roles?: string[];
  authorities?: string[];
  scope?: string;
  exp?: number;
}

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  login: (
    accessToken: string,
    refreshToken: string | null,
    userResponse: UserResponse,
    remember: boolean
  ) => void;
  logout: () => void;
  isAdmin: boolean;
  authLoading: boolean;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractRoles(input: unknown): string[] {
  if (!input) return [];
  const raw = Array.isArray(input)
    ? input
    : typeof input === "string"
    ? input.split(/\s+/)
    : [];
  return raw
    .map((r) => String(r).trim())
    .filter(Boolean)
    .map((r) => r.toUpperCase())
    .map((r) => r.replace(/^ROLE_/, ""));
}

function isAdminFromClaims(decoded: DecodedToken | any): boolean {
  const roles = extractRoles(decoded?.roles ?? decoded?.authorities ?? decoded?.scope);
  return roles.includes("ADMIN");
}

function isAdminFromUser(userLike: any): boolean {
  const roles = extractRoles(
    userLike?.roles ?? userLike?.authorities ?? userLike?.permissions
  );
  return roles.includes("ADMIN");
}

function setAuthCookie(token: string, maxAgeSec = 60 * 60 * 24) {
  document.cookie = `${AUTH_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`;
}
function clearAuthCookie() {
  document.cookie = `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}
function readCookie(name: string) {
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(name + "="))
      ?.split("=")[1] || null
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState(true);

  /** ---------- logout ---------- */
  const logout = useCallback(() => {
    console.warn("[AUTH] LOGOUT called");
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_LS_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_SS_KEY);
      localStorage.removeItem(AUTH_BUNDLE_KEY);
    } catch {}
    clearAuthCookie();
    setUser(null);
    setToken(null);
    setIsAdmin(false);
  }, []);

  /** ---------- login ---------- */
  const login = useCallback(
    (
      accessToken: string,
      refreshToken: string | null,
      userResponse: UserResponse,
      remember: boolean
    ): void => {
      // เก็บ token ก่อนเพื่อกันกรณี decode fail
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      setAuthCookie(accessToken, 60 * 60 * 24);

      // refresh token
      localStorage.removeItem(REFRESH_TOKEN_LS_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_SS_KEY);
      if (refreshToken) {
        if (remember) localStorage.setItem(REFRESH_TOKEN_LS_KEY, refreshToken);
        else sessionStorage.setItem(REFRESH_TOKEN_SS_KEY, refreshToken);
      }

      localStorage.setItem(
        AUTH_BUNDLE_KEY,
        JSON.stringify({ accessToken, refreshToken, tokenType: "Bearer", user: userResponse })
      );

      setToken(accessToken);
      setUser(userResponse);

      try {
        const decoded = jwtDecode<DecodedToken>(accessToken);
        setIsAdmin(isAdminFromClaims(decoded) || isAdminFromUser(userResponse));
      } catch {
        setIsAdmin(isAdminFromUser(userResponse));
      }
    },
    []
  );

  /** ---------- refreshMe ---------- */
  const refreshMe = useCallback(async () => {
    if (!token) return;
    try {
      setAuthLoading(true);
      const res = await api.get<UserResponse>("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
      setIsAdmin(isAdminFromUser(res.data));
    } catch (e) {
      console.error("refreshMe failed", e);
    } finally {
      setAuthLoading(false);
    }
  }, [token]);

  /** ---------- refresh token ---------- */
  const handleTokenRefresh = useCallback(async () => {
    const rt =
      localStorage.getItem(REFRESH_TOKEN_LS_KEY) ||
      sessionStorage.getItem(REFRESH_TOKEN_SS_KEY);
    if (!rt) {
      logout();
      return;
    }
    try {
      const { data } = await api.post<{
        accessToken: string;
        refreshToken: string | null;
        user: UserResponse;
      }>("/api/auth/refresh", { refreshToken: rt });

      const remembered = !!localStorage.getItem(REFRESH_TOKEN_LS_KEY);
      login(data.accessToken, data.refreshToken, data.user, remembered);
    } catch (error: any) {
      console.error("Refresh failed:", error?.response?.status, error?.message);
      logout();
    }
  }, [login, logout]);

  /** ---------- initializeAuth (run once) ---------- */
  const initRan = useRef(false);
  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    const initializeAuth = async () => {
      try {
        let storedToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY);
        if (!storedToken) storedToken = readCookie(AUTH_COOKIE_NAME);
        if (!storedToken) {
          try {
            const bundle = JSON.parse(localStorage.getItem(AUTH_BUNDLE_KEY) || "null");
            if (bundle?.accessToken) storedToken = bundle.accessToken as string;
          } catch {}
        }

        if (!storedToken) {
          setAuthLoading(false);
          return;
        }

        let decoded: DecodedToken | null = null;
        try {
          decoded = jwtDecode(storedToken);
        } catch (e) {
          console.warn("Decode token failed:", e);
        }

        if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
          await handleTokenRefresh();
          return;
        }

        setToken(storedToken);
        setIsAdmin(isAdminFromClaims(decoded ?? {}));

        try {
          const res = await api.get<UserResponse>("/api/auth/me", {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          setUser(res.data);
          setIsAdmin(isAdminFromUser(res.data));
        } catch (e: any) {
          const status = e?.response?.status;
          if (status === 401 || status === 403) {
            await handleTokenRefresh();
          } else {
            console.error("Fetch /me failed (non-auth):", status);
          }
        }
      } catch (error) {
        console.error("Auth init error:", error);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, [handleTokenRefresh]);

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAdmin, authLoading, refreshMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

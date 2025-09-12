"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

// เราจะย้าย Type Definition มาไว้ที่นี่เลย เพื่อให้จัดการง่าย
// หรือจะ import มาจาก @/types ก็ได้ครับ
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

// โครงสร้างของข้อมูลที่เราจะใช้ใน Token
interface DecodedToken {
  sub: string; // Subject (user ID)
  roles: string[];
  email: string;
  displayName: string;
}

// โครงสร้างของ Context
interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  login: (accessToken: string, userResponse: UserResponse) => void; // ⭐️ แก้ไขตรงนี้
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // เมื่อแอปโหลดครั้งแรก ให้ตรวจสอบ token จาก localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      try {
        const decoded: DecodedToken = jwtDecode(storedToken);
        setToken(storedToken);
        setIsAdmin(decoded.roles.includes('ADMIN'));
        // ดึงข้อมูล User ล่าสุดจาก /me เพื่อความปลอดภัย
        fetchCurrentUser(storedToken);
      } catch (error) {
        console.error("Invalid token on initial load:", error);
        logout(); // ถ้า token เสีย ให้ logout
      }
    }
  }, []);

  const fetchCurrentUser = async (currentToken: string) => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/me', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const userData: UserResponse = await res.json();
        setUser(userData);
        // อัปเดต isAdmin อีกครั้ง เผื่อมีการเปลี่ยนแปลง Role
        setIsAdmin(userData.roles.includes('ADMIN'));
      } else {
        logout();
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      logout();
    }
  };

  // ⭐️ แก้ไขฟังก์ชัน login ให้รับพารามิเตอร์ 2 ตัว
  const login = (accessToken: string, userResponse: UserResponse) => {
    try {
      const decoded: DecodedToken = jwtDecode(accessToken);
      localStorage.setItem('accessToken', accessToken);
      setToken(accessToken);
      setUser(userResponse); // ใช้ข้อมูล user ที่ได้จากการ login โดยตรง
      setIsAdmin(decoded.roles.includes('ADMIN'));
    } catch (error) {
      console.error("Failed to process token on login:", error);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setToken(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
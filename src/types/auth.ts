export type User = {
  id: string;
  email: string;
  name: string;
  role?: 'USER' | 'ADMIN';
  avatarUrl?: string;
};

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = { email: string; password: string; name: string };

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string; // ถ้า backend เลือกใช้ cookie สำหรับ refresh อันนี้อาจไม่ส่งมาก็ได้
  user: User;
};

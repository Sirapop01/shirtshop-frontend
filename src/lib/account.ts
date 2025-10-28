// src/lib/account.ts
import api from "./api";

/** DELETE /api/users/me (ต้องแนบ Bearer token) */
export async function deleteMyAccount(): Promise<string> {
  const { data } = await api.delete("/api/auth/me");
  return (data?.message as string) || "Account deleted";
}

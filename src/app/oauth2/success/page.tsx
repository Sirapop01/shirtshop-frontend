"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function OAuthSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [msg, setMsg] = useState("Processing...");

  useEffect(() => {
    const token = params.get("token"); // Next จะ decode ให้แล้ว
    if (!token) {
      console.warn("No token found in query");
      router.replace("/login?social=failed&reason=no_token");
      return;
    }

    // เก็บ token (dev: localStorage; โปรดเปลี่ยนเป็น httpOnly cookie เมื่อขึ้น prod)
    try {
      localStorage.setItem("auth_token", token);
    } catch (e) {
      console.error("Cannot save token", e);
    }

    // ทดสอบเรียก API เพื่อยืนยันว่าใช้ได้
    const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api";
    fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          console.error("me() not OK:", r.status, t);
          router.replace(`/login?social=failed&reason=me_${r.status}`);
          return;
        }
        setMsg("Signed in! Redirecting...");
        router.replace("/"); // ไปหน้าแรก/หน้า dashboard
      })
      .catch((e) => {
        console.error("Fetch /users/me failed:", e);
        router.replace(`/login?social=failed&reason=network_me`);
      });
  }, [params, router]);

  return <div className="p-6">{msg}</div>;
}

"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import AvatarUploader from "@/components/shared/AvatarUploader";

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // --- simple password strength (สายตา) ---
  const [pwd, setPwd] = useState("");
  const strength = useMemo(() => {
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[a-z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return s; // 0..5
  }, [pwd]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);

    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirmPassword") || "");
    if (password.length < 8) return setError("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
    if (password !== confirm) return setError("รหัสผ่านไม่ตรงกัน");

    setSubmitting(true);
    try {
      // 1) เตรียม JSON ส่วนข้อมูลผู้ใช้
      const firstName = String(fd.get("firstName") || "");
      const lastName = String(fd.get("lastName") || "");
      const registerPayload = {
        email: String(fd.get("email") || ""),
        password,
        displayName: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        phone: String(fd.get("tel") || ""),
      };

      // 2) สร้าง FormData ใหม่ แล้วใส่ JSON + ไฟล์ (avatar)
      const form = new FormData();
      form.append(
        "request",
        new Blob([JSON.stringify(registerPayload)], { type: "application/json" })
      );

      const avatarFile = (fd.get("avatar") as File) || null; // <<< ต้องมี name="avatar"
      if (avatarFile && avatarFile.size > 0) {
        form.append("avatar", avatarFile);
      }

      // 3) ส่งไป BE
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        body: form, // อย่าตั้ง Content-Type เอง ให้ browser จัดการ boundary
      });

      if (!res.ok) throw new Error(await res.text().catch(() => "Register failed"));
      const data = await res.json();

      // 4) auto-login ถ้า BE คืน token+user
      if (data?.accessToken && data?.user) {
        localStorage.setItem(
          "shirtshop_auth",
          JSON.stringify({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data?.refreshToken ?? null,
            tokenType: data?.tokenType ?? "Bearer",
          })
        );
        setOk("สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...");
        setTimeout(() => { router.push("/"); router.refresh(); }, 600);
      } else {
        setOk(data?.message || "สมัครสมาชิกสำเร็จ! โปรดเข้าสู่ระบบ");
        setTimeout(() => router.push("/login"), 1000);
      }
    } catch (err: any) {
      setError(err?.message || "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }



  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-1 mb-6">
        <Image src="/logo.png" alt="StyleWhere" width={220} height={80} priority />
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Create your StyleWhere account
        </h1>
        <p className="text-sm text-gray-500">สมัครง่าย ๆ ภายในไม่กี่ขั้นตอน</p>
      </div>

      {/* Card */}
      <div className="max-w-5xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm">
        {/* Top bar / title */}
        <div className="px-6 md:px-8 py-4 border-b">
          <h2 className="text-base md:text-lg font-medium">Registration</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          {/* Layout: Left summary + Right form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT: Avatar & quick tips */}
            <aside className="lg:col-span-4">
              <div className="sticky top-4 space-y-5">
                <div className="flex flex-col items-center gap-3">
                  <AvatarUploader size={140} maxMB={5} />
                  <p className="text-xs text-gray-500">
                    แนะนำอัปโหลดรูปโปรไฟล์เพื่อการจดจำแบรนด์ส่วนตัวของคุณ
                  </p>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4">
                  <h3 className="text-sm font-semibold mb-2">เคล็ดลับ</h3>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                    <li>ใช้รหัสผ่านตั้งแต่ 8 ตัวขึ้นไป และผสมอักษร/ตัวเลข/สัญลักษณ์</li>
                    <li>อีเมลควรใช้งานได้จริงเพื่อรับอีเมลยืนยัน</li>
                    <li>ชื่อ-นามสกุลจะแสดงบนใบเสร็จ/ที่อยู่จัดส่ง</li>
                  </ul>
                </div>
              </div>
            </aside>

            {/* RIGHT: Form fields */}
            <section className="lg:col-span-8">
              {/* Account */}
              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold text-gray-700">
                  ข้อมูลบัญชี (Account)
                </legend>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1" htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/5"
                      autoComplete="email"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ใช้สำหรับเข้าสู่ระบบและรับอีเมลยืนยัน
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm mb-1" htmlFor="password">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="อย่างน้อย 8 ตัว"
                      required
                      minLength={8}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/5"
                      autoComplete="new-password"
                      onChange={(e) => setPwd(e.target.value)}
                    />
                    {/* strength bar */}
                    <div className="mt-2 h-1.5 w-full bg-gray-200 rounded">
                      <div
                        className={`h-full rounded transition-all`}
                        style={{
                          width: `${(strength / 5) * 100}%`,
                          background:
                            strength < 2
                              ? "#ef4444"
                              : strength < 4
                                ? "#f59e0b"
                                : "#10b981",
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">
                      ผสมอักษรตัวใหญ่/เล็ก ตัวเลข และสัญลักษณ์ เพื่อความปลอดภัย
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm mb-1" htmlFor="confirmPassword">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="ยืนยันรหัสผ่าน"
                      required
                      minLength={8}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/5"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Divider */}
              <hr className="my-6" />

              {/* Profile */}
              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold text-gray-700">
                  ข้อมูลโปรไฟล์ (Profile)
                </legend>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1" htmlFor="firstName">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      placeholder="ชื่อ"
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" htmlFor="lastName">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      placeholder="นามสกุล"
                      required
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm mb-1" htmlFor="tel">
                      โทรศัพท์
                    </label>
                    <input
                      id="tel"
                      name="tel"
                      maxLength={10}
                      placeholder="095-xxx-xxxx"
                      inputMode="tel"
                      pattern="^0[0-9\- ]{8,}$"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/5"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      ใช้ติดต่อการจัดส่ง/ยืนยันตัวตน
                    </p>
                  </div>
                </div>
              </fieldset>

              {/* Alerts */}
              {error && (
                <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {ok && (
                <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {ok}
                </div>
              )}

              {/* Submit */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
                >
                  {submitting ? "Registering..." : "Create account"}
                </button>
                <span className="text-xs text-gray-500">
                  มีบัญชีแล้ว?{" "}
                  <a
                    href="/login"
                    className="underline decoration-dotted underline-offset-4 hover:text-gray-700"
                  >
                    เข้าสู่ระบบ
                  </a>
                </span>
              </div>
            </section>
          </div>
        </form>
      </div>
    </main>
  );
}

// src/app/register/page.tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import api, { setAccessToken, setRefreshToken } from "@/lib/api";
import axios, { AxiosError } from "axios";
import AvatarUploader from "@/components/shared/AvatarUploader";
import { useBranding } from "@/context/BrandingContext";

function isExternal(src?: string | null) {
  return !!src && /^https?:\/\//i.test(src);
}

export default function RegisterPage() {
  const router = useRouter();
  const branding = useBranding(); // {siteName, logoUrl}
  const siteName = branding?.siteName || "StyleWhere";
  const logoUrl = branding?.logoUrl || "/logo.png";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // --- password meter ---
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accept, setAccept] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasLen = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNum = /[0-9]/.test(pwd);
  const hasSym = /[^A-Za-z0-9]/.test(pwd);

  const strength = useMemo(() => {
    let s = 0;
    if (hasLen) s++;
    if (hasUpper) s++;
    if (hasLower) s++;
    if (hasNum) s++;
    if (hasSym) s++;
    return s; // 0..5
  }, [pwd]);

  const match = confirm.length > 0 && pwd === confirm;

  useEffect(() => {
    // clear message on typing
    if (error) setError(null);
  }, [pwd, confirm]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (!hasLen) return setError("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
    if (!match) return setError("รหัสผ่านไม่ตรงกัน");
    if (!accept)
      return setError("กรุณายอมรับข้อตกลงการใช้งานและนโยบายความเป็นส่วนตัว");

    const fd = new FormData(e.currentTarget);
    setSubmitting(true);

    try {
      // payload -> BE
      const firstName = String(fd.get("firstName") || "");
      const lastName = String(fd.get("lastName") || "");
      const registerPayload = {
        email: String(fd.get("email") || ""),
        password: pwd,
        displayName: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        phone: String(fd.get("tel") || ""),
      };

      // multipart
      const form = new FormData();
      form.append(
        "request",
        new Blob([JSON.stringify(registerPayload)], { type: "application/json" })
      );
      const avatarFile = (fd.get("avatar") as File) || null; // from <AvatarUploader name="avatar" />
      if (avatarFile && avatarFile.size > 0) form.append("avatar", avatarFile);

      const res = await api.post("/api/auth/register", form);
      const data = res.data as any;

      if (data?.accessToken) {
        setAccessToken(data.accessToken, "local");
        if (data?.refreshToken) setRefreshToken(data.refreshToken, "local");
        if (data?.user)
          localStorage.setItem("shirtshop_user", JSON.stringify(data.user));

        setOk("สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...");
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 600);
      } else {
        setOk(data?.message || "สมัครสมาชิกสำเร็จ! โปรดเข้าสู่ระบบ");
        setTimeout(() => router.push("/login"), 900);
      }
    } catch (err: unknown) {
      let msg = "สมัครสมาชิกไม่สำเร็จ";
      if (axios.isAxiosError(err)) {
        const ax = err as AxiosError<any>;
        msg = ax.response?.data?.message || ax.response?.data?.error || ax.message || msg;
      } else if (err instanceof Error) msg = err.message || msg;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const strengthColor =
    strength < 2 ? "bg-rose-500" : strength < 4 ? "bg-amber-500" : "bg-emerald-500";
  const strengthText = strength < 2 ? "Weak" : strength < 4 ? "Medium" : "Strong";

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50">
      {/* Hero / Heading */}
      <div className="mx-auto max-w-5xl px-4 pt-12 pb-8 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center">
          {isExternal(logoUrl) ? (
            <img src={logoUrl} alt={`${siteName} logo`} className="w-40 h-auto object-contain" />
          ) : (
            <Image
              src={logoUrl}
              alt={`${siteName} logo`}
              width={160}
              height={48}
              priority
              className="w-40 h-auto object-contain"
            />
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Create your <span className="">{siteName}</span> account
        </h1>
        <p className="mt-2 text-sm text-zinc-500">สมัครง่าย ๆ ภายในไม่กี่ขั้นตอน</p>
      </div>

      {/* Card */}
      <div className="mx-auto max-w-5xl rounded-2xl border border-zinc-200/70 bg-white/90 shadow-xl shadow-zinc-200/50 backdrop-blur">
        {/* Section title */}
        <div className="sticky top-0 z-[1] rounded-t-2xl border-b bg-white/80 px-5 py-4 backdrop-blur md:px-8">
          <h2 className="text-base font-medium md:text-lg">Registration</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-5 md:p-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* LEFT: Avatar + tips */}
            <aside className="lg:col-span-4">
              <div className="space-y-5 lg:sticky lg:top-6">
                <div className="flex flex-col items-center gap-3">
                  {/* Ensure AvatarUploader provides <input name="avatar" /> */}
                  <AvatarUploader name="avatar" size={140} maxMB={5} />
                  <p className="text-xs text-zinc-500 text-center">
                    แนะนำอัปโหลดรูปโปรไฟล์เพื่อให้ลูกค้าจำคุณได้ง่ายขึ้น
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold">เคล็ดลับ</h3>
                  <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-600">
                    <li>รหัสผ่าน ≥ 8 ตัว และผสมตัวใหญ่/เล็ก ตัวเลข และสัญลักษณ์</li>
                    <li>ใช้อีเมลที่ใช้งานได้จริง เพื่อรับอีเมลยืนยัน</li>
                    <li>ชื่อ-นามสกุล จะใช้บนใบเสร็จ/ที่อยู่จัดส่ง</li>
                  </ul>
                </div>
              </div>
            </aside>

            {/* RIGHT: Form */}
            <section className="lg:col-span-8">
              {/* Account */}
              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold text-zinc-700">ข้อมูลบัญชี (Account)</legend>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm" htmlFor="email">
                      Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                      autoComplete="email"
                    />
                    <p className="mt-1 text-xs text-zinc-500">ใช้สำหรับเข้าสู่ระบบและรับอีเมลยืนยัน</p>
                  </div>

                  <div className="relative">
                    <label className="mb-1 block text-sm" htmlFor="password">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="password"
                      name="password"
                      type={showPwd ? "text" : "password"}
                      placeholder="อย่างน้อย 8 ตัว"
                      required
                      minLength={8}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-10 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                      autoComplete="new-password"
                      value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                      aria-invalid={!hasLen}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-2 top-[30px] rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? "Hide" : "Show"}
                    </button>

                    {/* strength bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 w-full rounded bg-zinc-200">
                        <div
                          className={`h-full rounded ${strengthColor} transition-all`}
                          style={{ width: `${(strength / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-12 text-[11px] text-zinc-500">{strengthText}</span>
                    </div>

                    {/* checklist */}
                    <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-600">
                      <li className={hasLen ? "text-emerald-600" : undefined}>• ≥ 8 ตัวอักษร</li>
                      <li className={hasNum ? "text-emerald-600" : undefined}>• มีตัวเลข</li>
                      <li className={hasUpper ? "text-emerald-600" : undefined}>• ตัวพิมพ์ใหญ่</li>
                      <li className={hasLower ? "text-emerald-600" : undefined}>• ตัวพิมพ์เล็ก</li>
                      <li className={hasSym ? "text-emerald-600" : undefined}>• สัญลักษณ์</li>
                    </ul>
                  </div>

                  <div className="relative">
                    <label className="mb-1 block text-sm" htmlFor="confirmPassword">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="ยืนยันรหัสผ่าน"
                      required
                      minLength={8}
                      className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-zinc-200 ${
                        match || confirm.length === 0 ? "border-zinc-300 focus:border-zinc-400" : "border-rose-300 focus:border-rose-400"
                      }`}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      aria-invalid={confirm.length > 0 && !match}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-2 top-[30px] rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                    {confirm.length > 0 && (
                      <p className={`mt-1 text-[11px] ${match ? "text-emerald-600" : "text-rose-600"}`}>
                        {match ? "ยืนยันรหัสผ่านตรงกัน" : "รหัสผ่านไม่ตรงกัน"}
                      </p>
                    )}
                  </div>
                </div>
              </fieldset>

              <hr className="my-6 border-zinc-200" />

              {/* Profile */}
              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold text-zinc-700">ข้อมูลโปรไฟล์ (Profile)</legend>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm" htmlFor="firstName">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      placeholder="ชื่อ"
                      required
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm" htmlFor="lastName">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      placeholder="นามสกุล"
                      required
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm" htmlFor="tel">
                      โทรศัพท์
                    </label>
                    <input
                      id="tel"
                      name="tel"
                      maxLength={10}
                      placeholder="095-xxx-xxxx"
                      inputMode="tel"
                      pattern="^0[0-9\- ]{8,}$"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                    />
                    <p className="mt-1 text-[11px] text-zinc-500">ใช้ติดต่อการจัดส่ง/ยืนยันตัวตน</p>
                  </div>
                </div>
              </fieldset>

              {/* Terms */}
              <div className="mt-6">
                <label className="inline-flex items-start gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={accept}
                    onChange={(e) => setAccept(e.target.checked)}
                  />
                  <span>
                    ฉันยอมรับ <a href="/terms" className="underline">ข้อตกลงการใช้งาน</a> และ{" "}
                    <a href="/privacy" className="underline">นโยบายความเป็นส่วนตัว</a>
                  </span>
                </label>
              </div>

              {/* Alerts */}
              {error && (
                <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}
              {ok && (
                <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {ok}
                </div>
              )}

              {/* Submit */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm ring-1 ring-black/10 transition hover:bg-black disabled:opacity-60"
                >
                  {submitting ? "Registering..." : "Create account"}
                </button>
                <span className="text-xs text-zinc-500">
                  มีบัญชีแล้ว?{" "}
                  <a href="/login" className="underline decoration-dotted underline-offset-4 hover:text-zinc-700">
                    เข้าสู่ระบบ
                  </a>
                </span>
              </div>
            </section>
          </div>
        </form>
      </div>

      <div className="h-16" />
    </main>
  );
}

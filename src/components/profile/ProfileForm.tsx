// components/ProfileForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

type FormData = { firstName: string; lastName: string; phone: string };

export default function ProfileForm() {
  const { user, token, authLoading, refreshMe } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    firstName: "",
    lastName: "",
    phone: "",
  });

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onCancel = () => {
    setEditing(false);
    if (user) {
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
      });
    }
    setError(null);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      setError("Authentication error. Please log in again.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}`
          : "http://localhost:8080") + "/api/auth/me",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update profile.");
      }
      await refreshMe();
      setEditing(false);
    } catch (err: any) {
      setError(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 " +
    "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";
  const labelCls = "mb-1.5 block text-sm font-medium text-gray-700";

  if (!mounted || authLoading) {
    return (
      <div className="mx-auto max-w-5xl w-full">
        <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 h-6 w-40 rounded bg-gray-200" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-10 w-full rounded bg-gray-200" />
            <div className="h-10 w-full rounded bg-gray-200" />
            <div className="h-10 w-full rounded bg-gray-200 sm:col-span-2" />
            <div className="h-10 w-full rounded bg-gray-200 sm:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="text-center p-10">User not found. Please log in.</div>;
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 md:px-0">
      {/* Section header */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm px-6 py-5">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">บัญชีผู้ใช้</h2>
        <p className="mt-1 text-sm text-gray-500">แก้ไขข้อมูลส่วนตัวของคุณ</p>
    </section>

      {/* Card */}
      <section className="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur shadow-sm p-6 sm:p-7">
        {/* Top: avatar + name/email + action */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <Image
                src={user.profileImageUrl || "/default-avatar.png"}
                alt="User Avatar"
                width={88}
                height={88}
                className="h-20 w-20 rounded-full object-cover ring-1 ring-gray-200"
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-gray-900 sm:text-xl">
                {user.displayName || `${form.firstName} ${form.lastName}`.trim()}
              </h1>
              <p className="truncate text-gray-500">{user.email}</p>
            </div>
          </div>

          {/* Top right action button */}
          <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              aria-pressed={editing}
              className={[
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition",
                "cursor-pointer active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10",
                editing ? "bg-gray-200 text-gray-900 hover:bg-gray-300" : "bg-gray-900 text-white hover:bg-gray-800",
              ].join(" ")}
            >
              {editing ? "กำลังแก้ไข..." : "แก้ไขข้อมูล"}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-6">
          <fieldset disabled={!editing} aria-disabled={!editing} className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <div>
              <label htmlFor="firstName" className={labelCls}>ชื่อ</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={form.firstName}
                onChange={onChange}
                className={inputCls}
                autoComplete="given-name"
              />
            </div>

            <div>
              <label htmlFor="lastName" className={labelCls}>นามสกุล</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={form.lastName}
                onChange={onChange}
                className={inputCls}
                autoComplete="family-name"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className={labelCls}>อีเมล</label>
              <input id="email" type="email" value={user.email} disabled className={inputCls} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="phone" className={labelCls}>เบอร์โทรศัพท์</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={onChange}
                className={inputCls}
                placeholder="08xxxxxxxx"
                autoComplete="tel"
              />
            </div>
          </fieldset>

          {/* Actions */}
          {editing && (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-gray-300"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
          )}

          {error && <p className="text-right text-sm text-rose-600">{error}</p>}
        </form>
      </section>
    </main>
  );
}

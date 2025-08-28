"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";


import AvatarUploader from "@/components/AvatarUploader";

export default function RegisterPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirmPassword") || "");
    if (password.length < 8) return setError("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
    if (password !== confirm) return setError("รหัสผ่านไม่ตรงกัน");

    setSubmitting(true);
    try {
      // TODO: call API register
      router.push("/login");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      {/* หัวเรื่อง + โลโก้ */}
      <div className="flex flex-col items-center mb-4">
        <Image src="/logo.png" alt="StyleWhere" width={250} height={100} />
        <h1 className="mt-2 text-xl md:text-2xl font-semibold">Register StyleWhere</h1>
      </div>

      {/* กล่องฟอร์ม: ย่อขนาด + ใส่เงา */}
      <div className="max-w-3xl mx-auto bg-white border rounded-xl shadow-sm p-5 md:p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ซ้าย: โปรไฟล์ + อีเมล/พาสเวิร์ด */}
          <section className="space-y-4">
            {/* Avatar สวย ๆ */}
            <div className="flex justify-center">
              <AvatarUploader size={136} maxMB={5} />
            </div>
            <div className="space-y-3">
              <div>
                <label className="block mb-1 text-sm">Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="email"
                  required
                  className="w-full border rounded-md p-2 text-sm"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm">Password</label>
                <input
                  name="password"
                  type="password"
                  placeholder="password"
                  required
                  minLength={8}
                  className="w-full border rounded-md p-2 text-sm"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm">Confirm Password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  required
                  minLength={8}
                  className="w-full border rounded-md p-2 text-sm"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </section>

          {/* ขวา: ข้อมูลส่วนตัว/ที่อยู่ */}
          <section className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm">First Name</label>
                <input name="firstName" placeholder="first name" required className="w-full border rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Last Name</label>
                <input name="lastName" placeholder="last name" required className="w-full border rounded-md p-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-sm">TEL</label>
              <input
                name="tel"
                placeholder="095-xxx-xxxx"
                className="w-full border rounded-md p-2 text-sm"
                inputMode="tel"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm">Country</label>
              <select name="country" required className="w-full border rounded-md p-2 bg-white text-sm">
                <option value="">country</option>
                <option value="TH">Thailand</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="JP">Japan</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm">Address</label>
              <input name="address" placeholder="Address" className="w-full border rounded-md p-2 text-sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block mb-1 text-sm">Town</label>
                <input name="town" placeholder="town" className="w-full border rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="block mb-1 text-sm">State</label>
                <input name="state" placeholder="state" className="w-full border rounded-md p-2 text-sm" />
              </div>
              <div>
                <label className="block mb-1 text-sm">Postcode</label>
                <input name="postcode" placeholder="postcode" className="w-full border rounded-md p-2 text-sm" />
              </div>
            </div>
          </section>

          {/* Error */}
          {error && <p className="md:col-span-2 text-red-600 text-sm">{error}</p>}

          {/* ปุ่ม Register: ขนาดเล็กลง */}
          <div className="md:col-span-2 flex justify-center pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="min-w-32 border rounded-md px-5 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {submitting ? "Registering..." : "Register"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type User = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

const sideMenus = [
  { key: "profile", label: "Profile", href: "/profile" },
  { key: "address", label: "Address", href: "/address" },
  { key: "favorite", label: "Favorite", href: "/favorite" },
  { key: "purchase", label: "Purchase", href: "/purchase" },
  { key: "shipping", label: "Shipping", href: "/shipping" },
  { key: "cart", label: "shopping cart", href: "/cart" },
];

export default function ProfilePage() {
  // mock user (ต่อกับ backend จริงค่อยดึงจาก API/JWT)
  const [user] = useState<User>({
    firstName: "Cristiano",
    lastName: "Ronaldo",
    email: "thegoat@gmail.com",
    phone: "12345124124",
  });

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* ============ Left Sidebar ============ */}
          <aside className="col-span-12 md:col-span-3">
            <div className="sticky top-6 rounded-xl border bg-white p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-black text-white grid place-items-center font-semibold">
                  S
                </div>
                <span className="font-medium">StyleWhere</span>
              </div>

              <nav className="flex flex-col">
                {sideMenus.map((m, idx) => (
                  <Link
                    key={m.key}
                    href={m.href}
                    className={`rounded-md px-3 py-2 text-sm ${
                      m.key === "profile"
                        ? "bg-green-100 text-gray-900 border-l-4 border-green-500"
                        : "text-gray-700 hover:bg-gray-50"
                    } ${idx === 0 ? "mt-0" : "mt-1"}`}
                  >
                    {m.label}
                  </Link>
                ))}

                <button
                  className="mt-4 w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    // TODO: call logout
                  }}
                >
                  Log Out
                </button>
              </nav>
            </div>
          </aside>

          {/* ============ Main Content ============ */}
          <main className="col-span-12 md:col-span-9">
            {/* Top banner (แถบสีเขียวตามตัวอย่าง) */}
            <div className="h-20 w-full rounded-t-xl bg-[#9CAF88]" />

            {/* Card */}
            <section className="-mt-6 rounded-b-xl rounded-t-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              {/* Header: avatar + name + email + edit */}
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-white">
                    {/* ใส่รูปไว้ที่ /public/avatar.jpg */}
                    <Image
                      src="/avatar.jpg"
                      alt="avatar"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold leading-6">
                      {user.firstName} {user.lastName}
                    </h2>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="h-9 rounded-md bg-[#9CAF88] px-5 text-sm font-medium text-white hover:opacity-90"
                  onClick={() => {
                    // TODO: toggle edit mode / route ไปหน้าแก้ไข
                  }}
                >
                  Edit
                </button>
              </div>

              {/* Form (disabled) */}
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="First Name">
                  <Input value={user.firstName} disabled />
                </Field>

                <Field label="Last Name">
                  <Input value={user.lastName} disabled />
                </Field>

                <Field label="Email">
                  <Input value={user.email} disabled />
                </Field>

                <Field label="Password">
                  <Input value="" placeholder="" disabled />
                </Field>

                <Field label="Phone Number" className="md:col-span-2">
                  <Input value={user.phone} disabled />
                </Field>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small reusable UI ---------- */
function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-gray-800">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  disabled,
  placeholder,
}: {
  value?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      readOnly={disabled}
      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder-gray-300 outline-none focus:ring-2 focus:ring-black/5"
    />
  );
}

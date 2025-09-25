// components/ProfileForm.tsx  (Tailwind, responsive)
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";

type FormData = {
  firstName: string;
  lastName: string;
  phone: string;
};

export default function ProfileForm() {
  const { user, token, authLoading, refreshMe } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName:  user.lastName  || "",
        phone:     user.phone     || "",
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName:  user.lastName  || "",
        phone:     user.phone     || "",
      });
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      setError("Authentication error. Please log in again.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`
          : "http://localhost:8080/api/auth/me",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({} as any));
        throw new Error(errData.message || "Failed to update profile.");
      }
      await refreshMe();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase =
    "w-full min-w-0 p-3 border border-gray-300 rounded-lg text-base " +
    "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition " +
    "disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";

  if (!isMounted || authLoading) {
    return (
      <div className="mx-auto max-w-5xl w-full">
        <div className="animate-pulse rounded-xl border bg-white/70 p-6 sm:p-8">
          <div className="mb-8 h-7 w-40 rounded bg-gray-200" />
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
    <div className="mx-auto w-full max-w-5xl">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800 sm:text-2xl">Account</h2>
        <p className="text-sm text-gray-500">Manage your profile information</p>
      </div>

      {/* Card */}
      <div className="rounded-xl border bg-white/80 backdrop-blur shadow-sm p-5 sm:p-7 md:p-8">
        {/* top: avatar + name/email + edit button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <Image
                src={user.profileImageUrl || "/default-avatar.png"}
                alt="User Avatar"
                width={88}
                height={88}
                className="h-20 w-20 sm:h-22 sm:w-22 rounded-full object-cover ring-1 ring-gray-200"
              />
              {/* สถานะออนไลน์เล็ก ๆ (optional) */}
              {/* <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" /> */}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-gray-800 sm:text-xl">
                {user.displayName}
              </h1>
              <p className="truncate text-gray-500">{user.email}</p>
            </div>
          </div>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#adbc9f] text-white font-medium transition hover:bg-[#9caf8f]"
            >
              Edit
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="mb-2 block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={inputBase}
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="mb-2 block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={inputBase}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={user.email}
                disabled
                className={inputBase}
              />
            </div>

            {/* Password (placeholder only) */}
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                placeholder={isEditing ? "Enter new password to change" : "••••••••"}
                disabled={!isEditing}
                className={inputBase}
              />
            </div>

            {/* Phone */}
            <div className="sm:col-span-2">
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                inputMode="tel"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={inputBase}
              />
            </div>
          </div>

          {/* Actions */}
          {isEditing && (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-gray-200 text-gray-800 font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
          {error && <p className="text-right text-sm text-red-500">{error}</p>}
        </form>
      </div>
    </div>
  );
}

// components/ProfileForm.tsx (Tailwind Version)
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

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                phone: user.phone || "",
            });
        }
        console.log("User data loaded:", user);
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
                lastName: user.lastName || "",
                phone: user.phone || "",
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
            const response = await fetch("http://localhost:8080/api/auth/me", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to update profile.");
            }
            await refreshMe();               // ✅ ดึงข้อมูลล่าสุดเข้าคอนเท็กซ์
            setIsEditing(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyles = "w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";

    if (!isMounted || authLoading) {
        return <div className="text-center p-10">Loading profile...</div>;
    }

    if (!user) {
        return <div className="text-center p-10">User not found. Please log in.</div>;
    }

    return (
        <div className="bg-white p-8 md:p-10 rounded-lg shadow-sm max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center">
                    <Image
                        src={user.profileImageUrl || "/default-avatar.png"}
                        alt="User Avatar"
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-full mr-5 object-cover"
                    />
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-semibold text-gray-800">{user.displayName}</h1>
                        <p className="text-base text-gray-500">{user.email}</p>
                    </div>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-5 py-2.5 rounded-lg bg-[#adbc9f] text-white font-medium transition hover:bg-[#9caf8f]"
                    >
                        Edit
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* First Name */}
                    <div>
                        <label htmlFor="firstName" className="block mb-2 text-sm font-medium text-gray-700">First Name</label>
                        <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} disabled={!isEditing} className={inputStyles} />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label htmlFor="lastName" className="block mb-2 text-sm font-medium text-gray-700">Last Name</label>
                        <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} disabled={!isEditing} className={inputStyles} />
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700">Email</label>
                        <input type="email" id="email" name="email" value={user.email} disabled className={inputStyles} />
                    </div>

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">Password</label>
                        <input type="password" id="password" name="password" placeholder={isEditing ? "Enter new password to change" : "••••••••"} disabled={!isEditing} className={inputStyles} />
                    </div>

                    {/* Phone Number */}
                    <div className="md:col-span-2">
                        <label htmlFor="phone" className="block mb-2 text-sm font-medium text-gray-700">Phone Number</label>
                        <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} disabled={!isEditing} className={inputStyles} />
                    </div>
                </div>

                {isEditing && (
                    <div className="flex gap-3 mt-8 md:col-span-2 justify-end">
                        <button type="button" onClick={handleCancel} disabled={isLoading} className="px-6 py-2.5 rounded-lg bg-gray-200 text-gray-800 font-medium transition hover:bg-gray-300">
                            Cancel
                        </button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium transition hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
                {error && <p className="text-red-500 mt-4 text-right">{error}</p>}
            </form>
        </div>
    );
}
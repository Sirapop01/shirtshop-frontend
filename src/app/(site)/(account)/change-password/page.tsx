// src/app/(account)/change-password/page.tsx
"use client";

import { useState, useMemo } from "react";
import { changePassword } from "@/lib/auth";

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showCur, setShowCur] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showCon, setShowCon] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const validNew = useMemo(() => newPassword.length >= 8, [newPassword]);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null); setMsg(null);
        if (!currentPassword) return setErr("กรุณากรอกรหัสผ่านเดิม");
        if (!validNew) return setErr("รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร");
        if (newPassword !== confirm) return setErr("รหัสผ่านใหม่และยืนยันไม่ตรงกัน");
        try {
            setLoading(true);
            await changePassword({ currentPassword, newPassword });
            setMsg("เปลี่ยนรหัสผ่านสำเร็จ");
            setCurrentPassword(""); setNewPassword(""); setConfirm("");
        } catch (e: any) {
            const m = e?.response?.data?.message ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ";
            setErr(m);
        } finally {
            setLoading(false);
        }
    };

    // ปุ่ม toggle แบบกำหนด type ให้ชัดเจน
    const Toggle = ({on}:{on:()=>void}) => (
        <button type="button" onClick={on} className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            Toggle
        </button>
    );

    return (
        <div className="max-w-md mx-auto p-6">
            <h1 className="text-2xl font-semibold mb-1">เปลี่ยนรหัสผ่าน</h1>
            {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
            {msg && <p className="text-sm text-green-600 mb-3">{msg}</p>}

            <form onSubmit={onSubmit} className="space-y-3">
                <div>
                    <label className="block mb-1 text-sm">รหัสผ่านเดิม</label>
                    <div className="relative">
                        <input
                            type={showCur ? "text" : "password"}
                            className="w-full border rounded px-3 py-2 pr-16"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                        <Toggle on={() => setShowCur(s=>!s)} />
                    </div>
                </div>

                <div>
                    <label className="block mb-1 text-sm">รหัสผ่านใหม่</label>
                    <div className="relative">
                        <input
                            type={showNew ? "text" : "password"}
                            className="w-full border rounded px-3 py-2 pr-16"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoComplete="new-password"
                            minLength={8}
                            required
                        />
                        <Toggle on={() => setShowNew(s=>!s)} />
                    </div>
                    {newPassword.length>0 && !validNew && <p className="text-xs text-red-600 mt-1">อย่างน้อย 8 ตัวอักษร</p>}
                </div>

                <div>
                    <label className="block mb-1 text-sm">ยืนยันรหัสผ่านใหม่</label>
                    <div className="relative">
                        <input
                            type={showCon ? "text" : "password"}
                            className="w-full border rounded px-3 py-2 pr-16"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            autoComplete="new-password"
                            minLength={8}
                            required
                        />
                        <Toggle on={() => setShowCon(s=>!s)} />
                    </div>
                    {confirm.length>0 && confirm!==newPassword && <p className="text-xs text-red-600 mt-1">รหัสผ่านไม่ตรงกัน</p>}
                </div>

                <button type="submit" disabled={loading} className="w-full bg-black text-white py-2 rounded disabled:opacity-60">
                    {loading ? "กำลังเปลี่ยน..." : "ยืนยันเปลี่ยนรหัสผ่าน"}
                </button>
            </form>
        </div>
    );
}

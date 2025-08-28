"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!email || !password) {
            alert("กรอกอีเมลและรหัสผ่านให้ครบ");
            return;
        }

        router.push("/home");
    };

    return (
        <div className="grid min-h-screen grid-cols-1 xl:grid-cols-2">

            <div className="relative hidden xl:block xl:min-h-screen overflow-hidden">
                <Image
                    src="/loginbg.png"
                    alt="Login background"
                    fill
                    className="object-cover"
                    priority
                    sizes="(min-width: 1280px) 50vw, 0px"
                />
            </div>

            {/* ขวา: ฟอร์มกึ่งกลางทุกจอ */}
            <div className="flex items-center justify-center p-6">
                <form onSubmit={handleSubmit} className="w-full max-w-sm xl:max-w-md space-y-4">
                    <div className="flex justify-center">
                        <Image src="/logo.png" alt="StyleWhere Logo" width={160} height={48} />
                    </div>

                    <h1 className="text-2xl font-bold text-center">Login StyleWhere</h1>

                    <div>
                        <label className="mb-1 block">Email</label>
                        <input
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full border p-2 rounded"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block">Password</label>
                        <input
                            name="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full border p-2 rounded"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <div className="flex justify-between items-center">
                        <a href="/forgot-password" className="text-sm underline">
                            Forgot Password ?
                        </a>
                    </div>

                    <button type="submit" className="w-full border p-2 rounded mt-2">
                        Login
                    </button>

                    {/* Divider OR */}
                    <div className="flex items-center my-4">
                        <hr className="flex-grow border-t border-gray-300" />
                        <span className="px-3 text-gray-500">OR</span>
                        <hr className="flex-grow border-t border-gray-300" />
                    </div>

                    {/* Social / Register */}
                    <div className="flex flex-col items-center space-y-2">
                        <button type="button" onClick={() =>{router.push("/register")}} className="w-full border py-2 rounded flex items-center justify-center gap-2">
                            <span>Register with StyleWhere</span>
                        </button>
                        <button type="button" className="w-full border py-2 rounded flex items-center justify-center gap-2">
                            <span>Continue with Google</span>
                        </button>
                        <button type="button" className="w-full border py-2 rounded flex items-center justify-center gap-2">
                            <span>Continue with Facebook</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

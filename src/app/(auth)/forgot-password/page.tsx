'use client';

import { useState } from "react";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email) {
            alert("Please enter your email.");
            return;
        }
        // TODO: call backend API to send reset link
        console.log("Reset link sent to:", email);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            {/* Logo */}
            <img
                src="/logo.png"
                alt="logo"
                className="w-16 h-16 mb-4"
            />
            <h1 className="text-2xl font-bold mb-6">Forgot Password</h1>

            {/* Form */}
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm bg-white p-6 border border-gray-300 rounded-md shadow-sm"
            >
                <input
                    type="email"
                    placeholder="Enter Your Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-300"
                />
                <button
                    type="submit"
                    className="w-full py-2 bg-green-200 hover:bg-green-300 text-gray-700 font-semibold rounded"
                >
                    Send
                </button>
            </form>
        </div>
    );
}

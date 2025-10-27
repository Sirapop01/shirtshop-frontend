// src/app/(site)/tryon/page.tsx
"use client";

import { Suspense } from "react";
import TryOnClient from "./TryOnClient";

export default function TryOnPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading…</div>}>
            <TryOnClient />
        </Suspense>
    );
}

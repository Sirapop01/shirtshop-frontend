// src/app/(account)/layout.tsx
"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-6">
        <aside className="md:sticky md:top-24 h-max">
          <Sidebar />
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}

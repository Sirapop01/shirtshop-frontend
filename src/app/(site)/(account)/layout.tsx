// src/app/(account)/layout.tsx
"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="py-8"> {/* เอา max-w ออกจาก wrapper นอกสุด */}
      <div className="mx-auto max-w-7xl px-4 md:px-6"> {/* จะกว้างขึ้นกว่าของเดิม */}
        <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-6">
          <aside className="md:sticky md:top-24 h-max">
            <Sidebar />
          </aside>
          {/* อนุญาต full-bleed section ข้างใน */}
          <section className="min-w-0 overflow-visible">{children}</section>
        </div>
      </div>
    </div>
  );
}

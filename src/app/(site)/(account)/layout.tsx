// src/app/(account)/layout.tsx
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/context/AuthContext";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-grow p-6 sm:p-8 md:p-10">{children}</main>
      </div>
    </AuthProvider>
  );
}

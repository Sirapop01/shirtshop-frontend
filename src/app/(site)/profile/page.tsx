// app/profile/page.tsx (Tailwind Version)
import Sidebar from "@/components/profile/Sidebar";
import ProfileForm from "@/components/profile/ProfileForm";

export default function ProfilePage() {
  return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-grow p-6 sm:p-8 md:p-10">
          <ProfileForm />
        </main>
      </div>
  );
}
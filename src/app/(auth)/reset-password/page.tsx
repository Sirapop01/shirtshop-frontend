// app/(auth)/reset-password/page.tsx  (Server Component)
import ResetPasswordClient from "./reset-password-client";

export default function Page({
  searchParams,
}: {
  searchParams?: { email?: string };
}) {
  const initialEmail = (searchParams?.email ?? "").trim();
  return <ResetPasswordClient initialEmail={initialEmail} />;
}

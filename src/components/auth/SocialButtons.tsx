"use client";

export default function SocialButtons() {
  const OAUTH_BASE =
    process.env.NEXT_PUBLIC_BACKEND_BASE_OAUTH?.replace(/\/$/, "") ||
    "http://localhost:8080"; // fallback dev

  return (
    <div className="space-y-2">
      <a
        className="border rounded px-4 py-2 block text-center hover:bg-gray-50"
        href={`${OAUTH_BASE}/oauth2/authorization/google`}
      >
        Continue with Google
      </a>

      <a
        className="border rounded px-4 py-2 block text-center hover:bg-gray-50"
        href={`${OAUTH_BASE}/oauth2/authorization/facebook`}
      >
        Continue with Facebook
      </a>
    </div>
  );
}

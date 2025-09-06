'use client';
export default function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</div>;
}

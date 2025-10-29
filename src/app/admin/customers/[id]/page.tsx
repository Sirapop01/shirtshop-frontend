"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api, { buildUrl } from "@/lib/api";
import axios, { AxiosError } from "axios";

type CustomerDetail = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email: string;
  phone?: string | null;
  roles: string[];
  active: boolean;
  lastActive?: string | null;
  profileImageUrl?: string | null;
};

function InfoCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="text-xs tracking-wide text-gray-500">{title}</div>
      <div className="mt-1.5 text-base font-medium text-gray-900">
        {value ?? "-"}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="text-sm text-gray-500">&larr; Back</div>
      <div className="flex items-center gap-4">
        <div className="h-[72px] w-[72px] animate-pulse rounded-full bg-gray-200" />
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-56 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-16 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();

  const idParam = (params as Record<string, string | string[]>)?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // ✅ ใช้ axios instance จาก lib/api.ts
        const res = await api.get<CustomerDetail>(`/api/customers/${id}`);
        setData(res.data);
      } catch (e: unknown) {
        let msg = "Failed to fetch user";
        if (axios.isAxiosError(e)) {
          const ax = e as AxiosError<any>;
          msg =
            ax.response?.data?.message ||
            ax.response?.data?.error ||
            ax.message ||
            msg;
        } else if (e instanceof Error) {
          msg = e.message || msg;
        }
        setError(String(msg));
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <Skeleton />;

  if (error)
    return (
      <div className="mx-auto max-w-5xl p-6">
        <button
          className="mb-4 text-sm text-gray-500 hover:underline"
          onClick={() => router.back()}
        >
          ← Back
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </div>
    );

  if (!data)
    return (
      <div className="mx-auto max-w-5xl p-6 text-gray-600">No data found</div>
    );

  const fullName =
    data.displayName ||
    [data.firstName, data.lastName].filter(Boolean).join(" ") ||
    "-";

  const isAdmin = data.roles?.includes("ADMIN");
  const roleClasses = isAdmin
    ? "border-red-300 text-red-700 bg-red-50"
    : "border-blue-300 text-blue-700 bg-blue-50";

  // ✅ กันเคส path relative จาก BE
  const avatarSrc =
    data.profileImageUrl ? buildUrl(data.profileImageUrl) : "/avatar-placeholder.png";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Back */}
      <button
        className="text-sm text-gray-500 transition hover:text-gray-700 hover:underline"
        onClick={() => router.back()}
      >
        ← Back
      </button>

      {/* Header */}
      <div className="flex items-center gap-5 rounded-2xl border border-gray-100 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="avatar"
            src={avatarSrc}
            onError={(e) => {
              // ถ้ารูปเสีย ให้ fallback เป็น placeholder
              (e.currentTarget as HTMLImageElement).src = "/avatar-placeholder.png";
            }}
            className="h-[84px] w-[84px] rounded-full object-cover ring-2 ring-offset-2 ring-offset-white ring-gray-200"
          />
          <span
            className={`absolute -bottom-1 -right-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${roleClasses}`}
            title={`Role: ${isAdmin ? "ADMIN" : "USER"}`}
          >
            {isAdmin ? "ADMIN" : "USER"}
          </span>
        </div>

        <div className="min-w-0">
          <div className="truncate text-2xl font-semibold text-gray-900">
            {fullName}
          </div>
          <div className="truncate text-sm text-gray-600">{data.email}</div>

          {/* สถานะ Active/Inactive */}
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                data.active
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  data.active ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              {data.active ? "Active" : "Inactive"}
            </span>

            {data.lastActive && (
              <span className="text-xs text-gray-500">
                Last active: {new Date(data.lastActive).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div className="text-sm font-semibold tracking-wide text-gray-700">
          Profile Information
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoCard title="First Name" value={data.firstName || "-"} />
          <InfoCard title="Last Name" value={data.lastName || "-"} />
          <InfoCard title="Phone" value={data.phone || "-"} />
          <InfoCard title="Email" value={data.email} />
          <InfoCard
            title="Roles"
            value={
              data.roles?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {data.roles.map((r) => {
                    const isAdm = r === "ADMIN";
                    const chip = isAdm
                      ? "bg-red-50 text-red-700 border-red-300"
                      : "bg-blue-50 text-blue-700 border-blue-300";
                    return (
                      <span
                        key={r}
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${chip}`}
                      >
                        {r}
                      </span>
                    );
                  })}
                </div>
              ) : (
                "-"
              )
            }
          />
          <InfoCard
            title="User ID"
            value={<span className="font-mono text-sm text-gray-700">{data.id}</span>}
          />
        </div>
      </div>
    </div>
  );
}

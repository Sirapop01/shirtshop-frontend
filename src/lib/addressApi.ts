// src/lib/addressApi.ts
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function getAuthHeader() {
    const raw = typeof window !== "undefined" ? localStorage.getItem("shirtshop_auth") : null;
    try {
        const obj = raw ? JSON.parse(raw) : null;
        const token = obj?.accessToken;
        const type = obj?.tokenType || "Bearer";
        return token ? `${type} ${token}` : "";
    } catch { return ""; }
}

async function authFetch(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    const auth = getAuthHeader();
    if (auth) headers.set("Authorization", auth);
    const res = await fetch(`${API}${path}`, { ...init, headers, cache: "no-store" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export const addressApi = {
    list: () => authFetch("/api/addresses"),
    create: (body: any) => authFetch("/api/addresses", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: any) => authFetch(`/api/addresses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    remove: (id: string) => authFetch(`/api/addresses/${id}`, { method: "DELETE" }),
};

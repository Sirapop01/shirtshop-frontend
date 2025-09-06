const KEY = "recentlyViewed";
const LIMIT = 6;

export function getRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function pushRecentlyViewed(id?: string) {
  if (!id || typeof window === "undefined") return;
  const arr = getRecentlyViewed().filter((x) => x !== id);
  arr.unshift(id);
  if (arr.length > LIMIT) arr.length = LIMIT;
  localStorage.setItem(KEY, JSON.stringify(arr));
}

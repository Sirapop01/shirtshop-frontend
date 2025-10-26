export async function fetchToDataUrl(garmentUrl: string): Promise<string> {
    if (garmentUrl.startsWith("data:")) return garmentUrl; // already base64
    const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(garmentUrl)}`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Image proxy failed: ${res.status}`);
    const json = (await res.json()) as { dataUrl?: string; error?: string };
    if (!json.dataUrl) throw new Error(json.error || "No dataUrl");
    return json.dataUrl;
}

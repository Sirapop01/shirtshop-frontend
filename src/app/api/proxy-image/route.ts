import { NextRequest, NextResponse } from "next/server";

// GET /api/proxy-image?url=<encoded>
export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
        return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
    try {
        const resp = await fetch(url, { cache: "no-store" });
        if (!resp.ok) {
            return NextResponse.json({ error: `Fetch failed: ${resp.status}` }, { status: 502 });
        }
        const contentType = resp.headers.get("content-type") || "image/png";
        const buf = Buffer.from(await resp.arrayBuffer());
        const b64 = buf.toString("base64");
        const dataUrl = `data:${contentType};base64,${b64}`;
        return NextResponse.json({ dataUrl });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Proxy failed" }, { status: 500 });
    }
}

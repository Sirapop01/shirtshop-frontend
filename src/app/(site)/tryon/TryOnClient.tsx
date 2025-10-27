// src/app/(site)/tryon/TryOnClient.tsx
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// —— types —— //
type TryOnSuccess = { imageBase64?: string; resultBase64?: string };

// —— base URL: ใช้ตัวแปรเดียว — โดเมนล้วน —— //
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

// —— utils —— //
const stripPrefix = (s: string) =>
    s.replace(/^data:image\/[a-zA-Z0-9+.+-]+;base64,/, "");

async function resizeToDataURL(
    fileOrBlob: File | Blob,
    maxW = 960,
    mime = "image/jpeg",
    quality = 0.85
): Promise<string> {
    const blob = fileOrBlob;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
    });
    const scale = Math.min(1, maxW / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL(mime, quality);
}

async function fetchImageBlob(url: string): Promise<Blob> {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`Fetch image failed: HTTP ${res.status}`);
    return await res.blob();
}

async function fileToBase64Resized(
    file: File
): Promise<{ base64: string; preview: string }> {
    const dataUrl = await resizeToDataURL(file, 960, "image/jpeg", 0.85);
    return { base64: stripPrefix(dataUrl), preview: dataUrl };
}

async function urlToBase64Resized(url: string): Promise<string> {
    const blob = await fetchImageBlob(url);
    const dataUrl = await resizeToDataURL(blob, 960, "image/jpeg", 0.85);
    return stripPrefix(dataUrl);
}

const fmtElapsed = (sec: number) =>
    `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60)
        .toString()
        .padStart(2, "0")}`;

export default function TryOnClient() {
    const sp = useSearchParams();
    const router = useRouter();

    const garmentUrlRaw = sp.get("garmentUrl");
    const garmentUrl = useMemo(() => {
        if (!garmentUrlRaw) return "";
        try {
            return decodeURIComponent(garmentUrlRaw);
        } catch {
            return garmentUrlRaw;
        }
    }, [garmentUrlRaw]);

    const [garmentImgError, setGarmentImgError] = useState<string | null>(null);
    const [personImageBase64, setPersonImageBase64] = useState<string>("");
    const [personPreview, setPersonPreview] = useState<string>("");

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [imgBase64, setImgBase64] = useState<string | null>(null);
    const [errText, setErrText] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // timer + progress
    const [elapsed, setElapsed] = useState(0);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<number | null>(null);
    const progressRef = useRef<number | null>(null);

    const startTimers = () => {
        setElapsed(0);
        setProgress(0);
        timerRef.current = window.setInterval(() => setElapsed((v) => v + 1), 1000);
        progressRef.current = window.setInterval(() => {
            setProgress((p) => Math.min(90, p + Math.max(0.8, 6 - p * 0.05)));
        }, 700);
    };
    const stopTimers = (complete = false) => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        if (progressRef.current) window.clearInterval(progressRef.current);
        timerRef.current = null;
        progressRef.current = null;
        if (complete) setProgress(100);
    };
    useEffect(() => () => stopTimers(), []);

    // upload handlers
    const pickFile = () => fileInputRef.current?.click();

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setErrText(null);
        try {
            const { base64, preview } = await fileToBase64Resized(f);
            setPersonImageBase64(base64);
            setPersonPreview(preview);
        } catch (err: any) {
            setErrText(err?.message || "Cannot process image file.");
        }
    };

    const onTryOn = async () => {
        if (!garmentUrl) return setErrText("Missing garmentUrl");
        if (!personImageBase64) return setErrText("Please upload your photo first.");
        if (!API_BASE) return setErrText("Missing NEXT_PUBLIC_API_BASE");

        setLoading(true);
        setErrText(null);
        setImgBase64(null);
        startTimers();

        try {
            const garmentImageBase64 = await urlToBase64Resized(garmentUrl);

            // เรียกที่โดเมนล้วน + /api/tryon (สอดคล้องโครงใหม่)
            const res = await fetch(`${API_BASE}/api/tryon`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ garmentImageBase64, personImageBase64 }),
            });

            const text = await res.text();
            let data: any;
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }

            if (!res.ok) {
                const msg =
                    (typeof data === "object" && (data.message || data.error)) ||
                    (typeof data === "string" && data) ||
                    `HTTP ${res.status}`;
                setErrText(`Try-on failed: ${msg}`);
                stopTimers(false);
                return;
            }

            let result: string | null = null;
            if (typeof data === "object" && (data.imageBase64 || data.resultBase64)) {
                result = (data.imageBase64 || data.resultBase64) as string;
            } else if (typeof data === "string") {
                result = stripPrefix(data);
            }
            if (!result) {
                setErrText("Unexpected response format from backend.");
                stopTimers(false);
                return;
            }

            setImgBase64(result);
            stopTimers(true);
        } catch (e: any) {
            setErrText(e?.message || "Network error");
            stopTimers(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-5xl px-4 py-6">
            {/* Header actions */}
            <div className="mb-4 flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                >
                    <span className="text-xl">←</span> Change garment
                </button>

                {loading ? (
                    <div className="text-sm text-gray-500">
                        Rendering…{" "}
                        <span className="font-semibold text-gray-700">{fmtElapsed(elapsed)}</span>
                    </div>
                ) : imgBase64 ? (
                    <div className="text-sm text-emerald-700 font-medium">
                        Done in {fmtElapsed(elapsed)}
                    </div>
                ) : null}
            </div>

            {/* Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h1 className="text-xl font-semibold">Try-On</h1>

                {/* Previews row */}
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {/* Garment preview */}
                    <div className="rounded-xl border border-gray-200 p-2">
                        <div className="mb-2 text-sm font-medium text-gray-700">Selected garment</div>
                        {garmentUrl && !garmentImgError ? (
                            <img
                                src={garmentUrl}
                                crossOrigin="anonymous"
                                alt="garment"
                                className="mx-auto max-h-56 w-auto rounded-lg object-contain"
                                onError={() => setGarmentImgError("Cannot load garment image.")}
                            />
                        ) : (
                            <div className="flex h-56 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
                                {garmentImgError || "No garment selected"}
                            </div>
                        )}
                        <details className="mt-2 text-xs text-gray-600">
                            <summary className="cursor-pointer select-none">Show garment URL</summary>
                            <div className="mt-1 break-words rounded-lg border border-gray-200 bg-gray-50 p-2">
                                {garmentUrl || "-"}
                            </div>
                        </details>
                    </div>

                    {/* Person preview + in-frame upload */}
                    <div className="rounded-xl border border-gray-200 p-2">
                        <div className="mb-2 text-sm font-medium text-gray-700">Your photo</div>

                        <div className="relative">
                            {/* Preview box */}
                            {personPreview ? (
                                <img
                                    src={personPreview}
                                    alt="person preview"
                                    className="mx-auto max-h-56 w-auto rounded-lg object-contain"
                                />
                            ) : (
                                <div
                                    className="flex h-56 items-center justify-center rounded-lg bg-gray-50 text-gray-400"
                                    onClick={pickFile}
                                >
                                    Tap to upload
                                </div>
                            )}

                            {/* Overlay upload button */}
                            <button
                                type="button"
                                onClick={pickFile}
                                className="absolute bottom-3 right-3 rounded-full bg-black/80 px-3 py-2 text-xs font-medium text-white shadow hover:bg-black"
                                title="Upload photo"
                            >
                                📷 Upload
                            </button>

                            {/* Hidden input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={onFileChange}
                                className="hidden"
                            />
                        </div>

                        {/* Change link */}
                        {personImageBase64 && (
                            <button
                                type="button"
                                onClick={pickFile}
                                className="mt-2 text-xs text-blue-600 hover:underline"
                            >
                                Change photo
                            </button>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center gap-3">
                    <button
                        onClick={onTryOn}
                        disabled={loading || !garmentUrl || !personImageBase64}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white transition
            ${loading || !garmentUrl || !personImageBase64 ? "bg-gray-300" : "bg-black hover:bg-gray-800"}`}
                    >
                        {loading ? (
                            <>
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                                Processing…
                            </>
                        ) : (
                            <>Run Try-On</>
                        )}
                    </button>

                    {loading && (
                        <div className="flex-1">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                <div
                                    className="h-2 rounded-full bg-black transition-[width] duration-300"
                                    style={{ width: `${Math.round(progress)}%` }}
                                />
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                                Elapsed {fmtElapsed(elapsed)} • {Math.round(progress)}%
                            </div>
                        </div>
                    )}
                </div>

                {/* Error */}
                {errText && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {errText}
                    </div>
                )}

                {/* Result */}
                {imgBase64 && (
                    <div className="mt-6">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700">Result</h2>
                            <a
                                className="text-xs text-blue-600 hover:underline"
                                download="tryon_result.png"
                                href={`data:image/png;base64,${imgBase64}`}
                            >
                                Download PNG
                            </a>
                        </div>
                        <div className="rounded-xl border border-gray-200 p-2">
                            <img
                                alt="try-on result"
                                src={`data:image/png;base64,${imgBase64}`}
                                className="mx-auto max-h-[60vh] w-auto rounded-lg object-contain"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

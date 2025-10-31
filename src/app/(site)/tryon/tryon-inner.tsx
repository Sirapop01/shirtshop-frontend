// src/app/(site)/tryon/tryon-inner.tsx
"use client";

import { useMemo, useState, useRef, useEffect, DragEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type TryOnSuccess = { imageBase64?: string; resultBase64?: string };
type SpringError = { message?: string; error?: string };

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

/* ===================== utils ===================== */
const stripPrefix = (s: string) =>
  s.replace(/^data:image\/[a-zA-Z0-9+.+-]+;base64,/, "");

async function resizeToDataURL(
  fileOrBlob: File | Blob,
  maxW = 1280,
  mime = "image/jpeg",
  quality = 0.9
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
  ctx.fillStyle = "#fff"; // กัน PNG โปร่งใสเป็นดำ
  ctx.fillRect(0, 0, w, h);
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
  const dataUrl = await resizeToDataURL(file, 1280, "image/jpeg", 0.9);
  return { base64: stripPrefix(dataUrl), preview: dataUrl };
}
async function urlToBase64Resized(url: string): Promise<string> {
  const blob = await fetchImageBlob(url);
  const dataUrl = await resizeToDataURL(blob, 1280, "image/jpeg", 0.9);
  return stripPrefix(dataUrl);
}

const fmtElapsed = (sec: number) =>
  `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60)
    .toString()
    .padStart(2, "0")}`;

/* ===================== page ===================== */
export default function TryOnInner() {
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
    // โค้งโหลดยืดหยุ่น ให้รู้สึก “ขยับ”
    progressRef.current = window.setInterval(() => {
      setProgress((p) => Math.min(92, p + Math.max(0.8, 5.8 - p * 0.045)));
    }, 650);
  };
  const stopTimers = (complete = false) => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (progressRef.current) window.clearInterval(progressRef.current);
    timerRef.current = null;
    progressRef.current = null;
    if (complete) setProgress(100);
  };
  useEffect(() => () => stopTimers(), []);

  /* ========== upload handlers ========== */
  const pickFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await handleFile(f);
  };

  const handleFile = async (file: File) => {
    setErrText(null);
    if (!/^image\/(jpeg|png|webp|jpg)$/i.test(file.type)) {
      setErrText("รองรับเฉพาะไฟล์รูปภาพ JPG/PNG/WebP");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrText("ไฟล์ใหญ่เกิน 8MB");
      return;
    }
    try {
      const { base64, preview } = await fileToBase64Resized(file);
      setPersonImageBase64(base64);
      setPersonPreview(preview);
    } catch (err: any) {
      setErrText(err?.message || "ไม่สามารถประมวลผลรูปภาพได้");
    }
  };

  // Drag & Drop
  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f) await handleFile(f);
  };
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onTryOn = async () => {
    if (!garmentUrl) return setErrText("ไม่พบรูปเสื้อที่จะลอง (garmentUrl)");
    if (!personImageBase64) return setErrText("กรุณาอัปโหลดรูปของคุณก่อน");

    if (!BACKEND) {
      setErrText(
        "Backend base URL ว่าง กรุณาตั้งค่า NEXT_PUBLIC_BACKEND_URL"
      );
      return;
    }

    setLoading(true);
    setErrText(null);
    setImgBase64(null);
    startTimers();

    try {
      const garmentImageBase64 = await urlToBase64Resized(garmentUrl);
      const url = `${BACKEND}/api/tryon`;

      const res = await fetch(url, {
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
        setErrText(`ประมวลผลไม่สำเร็จ: ${msg}`);
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
        setErrText("รูปแบบผลลัพธ์ไม่ถูกต้อง");
        stopTimers(false);
        return;
      }

      setImgBase64(result);
      stopTimers(true);
    } catch (e: any) {
      setErrText(e?.message || "เครือข่ายมีปัญหา");
      stopTimers(false);
    } finally {
      setLoading(false);
    }
  };

  const onReset = () => {
    setPersonImageBase64("");
    setPersonPreview("");
    setImgBase64(null);
    setErrText(null);
    setElapsed(0);
    setProgress(0);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      {/* Hero / header */}
      <div className="mb-6 rounded-2xl bg-gradient-to-tr from-gray-900 via-gray-800 to-gray-700 px-5 py-5 text-white shadow-md md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">Virtual Try-On</h1>
          <p className="mt-1 text-sm text-gray-200">
            อัปโหลดรูปของคุณ แล้วระบบจะผสมกับเสื้อที่เลือกให้โดยอัตโนมัติ
          </p>
        </div>
        <div className="mt-3 flex items-center gap-3 md:mt-0">
          <button
            onClick={() => router.back()}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/20"
          >
            ← เปลี่ยนเสื้อ
          </button>
          {imgBase64 && (
            <a
              className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/30"
              download="tryon_result.png"
              href={`data:image/png;base64,${imgBase64}`}
            >
              ดาวน์โหลดผลลัพธ์
            </a>
          )}
        </div>
      </div>

      {/* step pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-gray-900 px-2.5 py-1 font-medium text-white">
          1 เลือกเสื้อ
        </span>
        <span className="rounded-full bg-gray-200 px-2.5 py-1 font-medium">
          2 อัปโหลดรูปคุณ
        </span>
        <span className="rounded-full bg-gray-200 px-2.5 py-1 font-medium">
          3 ประมวลผล & ดาวน์โหลด
        </span>
        <span className="ml-auto text-gray-500">
          {loading ? (
            <>
              กำลังรัน… <b className="text-gray-700">{fmtElapsed(elapsed)}</b>
            </>
          ) : imgBase64 ? (
            <>
              เสร็จใน <b className="text-emerald-700">{fmtElapsed(elapsed)}</b>
            </>
          ) : null}
        </span>
      </div>

      {/* card */}
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur">
        {/* previews row */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* garment */}
          <div className="rounded-xl border border-gray-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">
                เสื้อที่เลือก
              </div>
              {garmentUrl && (
                <a
                  href={garmentUrl}
                  target="_blank"
                  className="text-xs text-blue-600 hover:underline"
                >
                  เปิดรูป
                </a>
              )}
            </div>
            {garmentUrl && !garmentImgError ? (
              <img
                src={garmentUrl}
                crossOrigin="anonymous"
                alt="garment"
                className="mx-auto max-h-60 w-auto rounded-lg object-contain"
                onError={() => setGarmentImgError("โหลดรูปเสื้อไม่สำเร็จ")}
              />
            ) : (
              <div className="flex h-60 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
                {garmentImgError || "ยังไม่ได้เลือกเสื้อ"}
              </div>
            )}
            <details className="mt-2 text-xs text-gray-600">
              <summary className="cursor-pointer select-none">
                แสดง URL ของเสื้อ
              </summary>
              <div className="mt-1 break-words rounded-lg border border-gray-200 bg-gray-50 p-2">
                {garmentUrl || "-"}
              </div>
            </details>
          </div>

          {/* person + upload */}
          <div className="rounded-xl border border-gray-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-700">
                รูปของคุณ
              </div>
              {personImageBase64 && (
                <button
                  onClick={onReset}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  รีเซ็ต
                </button>
              )}
            </div>

            <div
              className={[
                "relative flex h-60 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed",
                personPreview ? "border-transparent" : "border-gray-300 hover:border-gray-400",
              ].join(" ")}
              onClick={(e) => {
                // เปิดไฟล์เฉพาะคลิกที่พื้นของกล่อง (ไม่ใช่คลิกที่ปุ่ม/รูป)
                if (e.target === e.currentTarget) pickFile();
              }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              role="button"
              aria-label="อัปโหลดรูป"
              tabIndex={0}
            >
              {personPreview ? (
                <img
                  src={personPreview}
                  alt="person preview"
                  className="mx-auto max-h-60 w-auto rounded-lg object-contain"
                />
              ) : (
                <div className="text-center">
                  <div className="text-4xl">📷</div>
                  <div className="mt-1 text-sm text-gray-600">คลิกเพื่อเลือกไฟล์ หรือวางรูปที่นี่</div>
                  <div className="text-[11px] text-gray-400">รองรับ JPG / PNG / WebP (≤ 8MB)</div>
                </div>
              )}

              {/* overlay upload pill */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // <— ป้องกันเด้งไปเรียก onClick ของ parent
                  pickFile();
                }}
                className="absolute bottom-3 right-3 rounded-full bg-black/85 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-black"
                title="เลือกไฟล์"
              >
                เลือกรูป
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  onFileChange(e);
                  // เลือกไฟล์เดิมซ้ำ ๆ ได้ (trigger change every time)
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="hidden"
              />
            </div>

            {/* Tips */}
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-500">
              <li>ถ่ายครึ่งตัว/เต็มตัว ฉากหลังเรียบ แสงพอ</li>
              <li>ยืนตรง หันหน้าตรง เพื่อลดการบิดเบี้ยว</li>
            </ul>
          </div>
        </div>

        {/* actions */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <button
            onClick={onTryOn}
            disabled={loading || !garmentUrl || !personImageBase64}
            className={[
              "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition",
              loading || !garmentUrl || !personImageBase64
                ? "bg-gray-300 text-gray-600"
                : "bg-black text-white hover:bg-gray-800",
            ].join(" ")}
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                กำลังประมวลผล…
              </>
            ) : (
              <>รัน Try-On</>
            )}
          </button>

          {/* progress */}
          {loading && (
            <div className="flex-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-gray-900 transition-[width] duration-300"
                  style={{ width: `${Math.round(progress)}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500">
                ใช้เวลา {fmtElapsed(elapsed)} • {Math.round(progress)}%
              </div>
            </div>
          )}
        </div>

        {/* error */}
        {errText && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errText}
          </div>
        )}

        {/* result */}
        {imgBase64 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">ผลลัพธ์</h2>
              <div className="flex items-center gap-2">
                <a
                  className="text-xs text-blue-600 hover:underline"
                  download="tryon_result.png"
                  href={`data:image/png;base64,${imgBase64}`}
                >
                  ดาวน์โหลด PNG
                </a>
                <button
                  onClick={() => setImgBase64(null)}
                  className="text-xs text-gray-600 hover:underline"
                >
                  ลองใหม่
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 p-2">
              <img
                alt="try-on result"
                src={`data:image/png;base64,${imgBase64}`}
                className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

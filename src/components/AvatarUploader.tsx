"use client";
import Image from "next/image";
import { useRef, useState } from "react";

type Props = {
  name?: string;      // ชื่อฟิลด์ใน form (default: "avatar")
  size?: number;      // ขนาดพรีวิว (px)
  maxMB?: number;     // จำกัดขนาดไฟล์ (MB)
};

export default function AvatarUploader({ name = "avatar", size = 136, maxMB = 5 }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function onPick() {
    inputRef.current?.click();
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    if (!isImage) return setErr("กรุณาเลือกรูปภาพเท่านั้น");
    const maxBytes = maxMB * 1024 * 1024;
    if (file.size > maxBytes) return setErr(`ไฟล์ใหญ่เกินไป (สูงสุด ${maxMB}MB)`);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-full overflow-hidden border bg-gray-100 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="avatar preview" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-gray-500">No Avatar</span>
        )}
      </div>

      <button
        type="button"
        onClick={onPick}
        className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
      >
        เลือกรูปภาพ
      </button>

      <input
        ref={inputRef}
        name={name}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />

      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

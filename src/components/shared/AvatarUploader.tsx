"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  name?: string;   // ชื่อฟิลด์ใน form (default: "avatar")
  size?: number;   // ขนาดพรีวิว (px)
  maxMB?: number;  // จำกัดขนาดไฟล์ (MB)
  required?: boolean;
};

export default function AvatarUploader({
  name = "avatar",
  size = 136,
  maxMB = 5,
  required = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ทำความสะอาด URL object เวลาเปลี่ยนไฟล์/ถอดคอมโพเนนต์
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const openPicker = () => {
    inputRef.current?.click();
  };

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setErr(null);
    if (inputRef.current) {
      inputRef.current.value = ""; // ให้เลือกไฟล์เดิมซ้ำได้
    }
  };

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setErr(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // ตรวจชนิด
    if (!file.type.startsWith("image/")) {
      setErr("กรุณาเลือกรูปภาพเท่านั้น");
      // รีเซ็ตเพื่อให้เลือกไฟล์ใหม่ได้ทันที
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // ตรวจขนาด
    const maxBytes = maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setErr(`ไฟล์ใหญ่เกินไป (สูงสุด ${maxMB}MB)`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // เปลี่ยนรูป (revoke รูปเก่า)
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const inputId = `file-${name}`;

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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={openPicker}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
          aria-controls={inputId}
        >
          เลือกรูปภาพ
        </button>
        {preview && (
          <button
            type="button"
            onClick={clearFile}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
          >
            ลบรูป
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        name={name}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
        aria-label="Upload avatar"
        required={required}
      />

      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

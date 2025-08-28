"use client";
import { useRef, useState } from "react";

type Props = {
  name?: string;
  size?: number;      
  maxMB?: number;     
};

export default function AvatarUploader({ name = "avatar", size = 128, maxMB = 5 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  function validate(file: File) {
    if (!file.type.startsWith("image/")) { setError("รองรับเฉพาะไฟล์รูปภาพ"); return false; }
    if (file.size > maxMB * 1024 * 1024) { setError(`ขนาดไฟล์ต้องไม่เกิน ${maxMB}MB`); return false; }
    setError(null);
    return true;
  }

  function handleFile(file?: File) {
    if (!file || !validate(file)) return;
    const url = URL.createObjectURL(file);
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return url; });
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0]);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function onDrag(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragOver(e.type === "dragenter" || e.type === "dragover");
  }

  function remove() {
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return null; });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-2">
      
      <div
        onClick={openPicker}
        onDrop={onDrop}
        onDragOver={onDrag}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        className={[
          "relative cursor-pointer rounded-full p-[2px] transition",
          dragOver ? "ring-2 ring-indigo-400" : "ring-0",
          "bg-gradient-to-br from-indigo-400 via-emerald-300 to-yellow-300"
        ].join(" ")}
        style={{ width: size + 8, height: size + 8 }}
        aria-label="Upload avatar"
        role="button"
      >
        <div
          className="rounded-full bg-white overflow-hidden flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          {preview ? (
            <img src={preview} alt="Avatar preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <svg width={size * 0.35} height={size * 0.35} viewBox="0 0 24 24" fill="none">
                <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 22a9 9 0 0 1 18 0" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              <span className="text-xs mt-1">Add your picture</span>
            </div>
          )}

          <div className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/35 transition flex items-center justify-center">
            <svg className="opacity-0 hover:opacity-100 transition" width={24} height={24} viewBox="0 0 24 24" fill="none">
              <path d="M4 8h3l2-3h6l2 3h3v10H4z" stroke="white" strokeWidth="1.6"/>
              <circle cx="12" cy="13" r="3.5" stroke="white" strokeWidth="1.6"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={openPicker} className="text-xs px-3 py-1 border rounded hover:bg-gray-50">
          Choose file
        </button>
        {preview && (
          <button type="button" onClick={remove} className="text-xs px-3 py-1 border rounded hover:bg-gray-50">
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}

      <input
        ref={inputRef}
        name={name}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="sr-only"
      />
    </div>
  );
}

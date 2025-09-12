export type UploadedImage = {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
};

export async function uploadAvatar(file: File): Promise<UploadedImage> {
  const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";
  const form = new FormData();
  form.append("file", file);
  form.append("folder", "shirtshop/avatars");

  const res = await fetch(`${base}/media/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Upload failed: ${msg}`);
  }
  return (await res.json()) as UploadedImage;
}

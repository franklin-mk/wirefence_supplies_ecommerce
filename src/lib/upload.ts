/** Client helper: signed direct upload to Cloudinary. Returns the delivery URL. */
export async function uploadImage(file: File, scope: "products" | "reviews"): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image must be under 8 MB.");

  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope }),
  });
  if (!signRes.ok) throw new Error((await signRes.json()).error ?? "Upload not allowed");
  const s = await signRes.json();

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", s.apiKey);
  form.append("timestamp", String(s.timestamp));
  form.append("signature", s.signature);
  form.append("folder", s.folder);

  const up = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: "POST", body: form });
  if (!up.ok) throw new Error("Image upload failed");
  return (await up.json()).secure_url as string;
}

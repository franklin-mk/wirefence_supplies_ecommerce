import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/** Signed direct-upload parameters. The browser uploads straight to Cloudinary. */
export function signUpload(folder: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);
  return {
    signature,
    timestamp,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  };
}

export async function deleteByUrl(url: string) {
  const m = url.match(/\/upload\/(?:[^/]+\/)*(v\d+\/)?(.+)\.[a-z0-9]+$/i);
  if (m?.[2]) await cloudinary.uploader.destroy(m[2]);
}

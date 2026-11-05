/**
 * Client-safe helper: inject auto-format (WebP/AVIF) + auto-quality + width
 * transformations into a Cloudinary delivery URL.
 */
export function cldUrl(url: string | null | undefined, width = 800) {
  if (!url) return "/placeholder.svg";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

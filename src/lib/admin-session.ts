/**
 * Admin OTP session cookie. HMAC-signed, HTTP-only, works on the Edge runtime
 * (middleware) because it only uses Web Crypto.
 *
 * Login flow: password sign-in -> email OTP -> this cookie is issued.
 * Both the Supabase session (role = admin) and this cookie are required for /admin.
 */
export const ADMIN_COOKIE = "wf_admin";

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must be >= 32 chars");
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export function sessionDays() {
  const d = Number(process.env.ADMIN_SESSION_DAYS ?? 7);
  return Math.min(14, Math.max(7, Number.isFinite(d) ? d : 7));
}

export async function signAdminCookie(userId: string) {
  const exp = Date.now() + sessionDays() * 86400_000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifyAdminCookie(value: string | undefined, userId?: string) {
  if (!value) return false;
  const [uid, expStr, sig] = value.split(".");
  if (!uid || !expStr || !sig) return false;
  if (Number(expStr) < Date.now()) return false;
  if (userId && uid !== userId) return false;
  const expected = await hmac(`${uid}.${expStr}`);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

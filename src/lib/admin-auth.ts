const SECRET = process.env.ADMIN_MAGIC_LINK_SECRET ?? "change-me";
const SESSION_DAYS = 30;

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return bufToHex(sig);
}

export async function createAdminSession(): Promise<string> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(expires);
  const sig = await hmac(payload);
  return `${payload}:${sig}`;
}

export async function verifyAdminSession(cookie: string): Promise<boolean> {
  const colonIdx = cookie.lastIndexOf(":");
  if (colonIdx === -1) return false;
  const payload = cookie.slice(0, colonIdx);
  const sig = cookie.slice(colonIdx + 1);
  const expectedSig = await hmac(payload);
  if (sig !== expectedSig) return false;
  return Date.now() < Number(payload);
}

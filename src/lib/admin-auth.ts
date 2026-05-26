const SESSION_DAYS = 30;
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getSecret(): string {
  const secret = process.env.ADMIN_MAGIC_LINK_SECRET;
  if (!secret) throw new Error("ADMIN_MAGIC_LINK_SECRET is not configured");
  return secret;
}

async function signHmac(message: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAdminSession(): Promise<string> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(expires);
  const sig = bufToHex(await signHmac(payload));
  return `${payload}:${sig}`;
}

export async function signMagicLink(): Promise<string> {
  const expires = Date.now() + MAGIC_LINK_TTL_MS;
  const payload = `magic:${expires}`;
  const sig = bufToHex(await signHmac(payload));
  return `${payload}:${sig}`;
}

export async function verifyMagicLink(token: string): Promise<boolean> {
  const colonIdx = token.lastIndexOf(":");
  if (colonIdx === -1) return false;
  const payload = token.slice(0, colonIdx);
  const sigHex = token.slice(colonIdx + 1);
  if (!payload.startsWith("magic:")) return false;
  const expires = Number(payload.slice(6));
  if (Date.now() > expires) return false;
  if (sigHex.length % 2 !== 0) return false;
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
}

export async function verifyAdminSession(cookie: string): Promise<boolean> {
  const colonIdx = cookie.lastIndexOf(":");
  if (colonIdx === -1) return false;
  const payload = cookie.slice(0, colonIdx);
  const sigHex = cookie.slice(colonIdx + 1);

  // Convert hex signature back to bytes for timing-safe verify
  if (sigHex.length % 2 !== 0) return false;
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    new TextEncoder().encode(payload)
  );
  if (!valid) return false;
  return Date.now() < Number(payload);
}

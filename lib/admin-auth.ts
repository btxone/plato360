const SESSION_COOKIE = "plato360_restaurant_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const encoder = new TextEncoder();

function runtimeEnv(name: string, fallback: string) {
  return typeof process !== "undefined" && process.env[name] ? process.env[name] : fallback;
}

export function getAdminCredentials() {
  return {
    username: runtimeEnv("ADMIN_USERNAME", "admin"),
    password: runtimeEnv("ADMIN_PASSWORD", "plato360-local"),
    secret: runtimeEnv("ADMIN_SESSION_SECRET", "plato360-local-session-secret"),
  };
}

function encodeBase64Url(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return encodeBase64Url(new Uint8Array(signature));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function readCookie(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return null;
  const value = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}

export async function createAdminSession(username: string) {
  const payload = `${username}.${Date.now()}`;
  const signature = await sign(payload, getAdminCredentials().secret);
  return `${encodeBase64Url(payload)}.${signature}`;
}

export async function isAdminSession(cookieHeader: string | null | undefined) {
  const token = readCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return false;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  try {
    const payload = decodeBase64Url(encodedPayload);
    const separator = payload.lastIndexOf(".");
    if (separator < 1) return false;
    const username = payload.slice(0, separator);
    const timestamp = Number(payload.slice(separator + 1));
    if (!username || !Number.isFinite(timestamp) || Date.now() - timestamp > SESSION_TTL_SECONDS * 1000) return false;
    const expectedSignature = await sign(payload, getAdminCredentials().secret);
    return safeEqual(signature, expectedSignature) && username === getAdminCredentials().username;
  } catch {
    return false;
  }
}

export function adminSessionCookie(token: string) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearAdminSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function isAdminRequest(request: Request) {
  return isAdminSession(request.headers.get("cookie"));
}


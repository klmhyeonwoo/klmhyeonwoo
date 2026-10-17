import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

function cookieName(id: string) {
  return `post_access_${id}`;
}

function sessionValue(id: string, passwordHash: string) {
  const secret = process.env.ADMIN_PASSWORD ?? passwordHash;
  return createHmac("sha256", secret).update(`${id}:${passwordHash}`).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function hashPostPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function passwordMatches(password: string, passwordHash: string) {
  const [salt, saved] = passwordHash.split(":");
  if (!salt || !saved) return false;
  return safeEqual(scryptSync(password, salt, 64).toString("hex"), saved);
}

export async function hasPostAccess(id: string, passwordHash: string) {
  return safeEqual((await cookies()).get(cookieName(id))?.value ?? "", sessionValue(id, passwordHash));
}

export function grantPostAccess(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }, id: string, passwordHash: string) {
  response.cookies.set(cookieName(id), sessionValue(id, passwordHash), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: `/posts/${id}`,
    maxAge: 60 * 60 * 24 * 30,
  });
}

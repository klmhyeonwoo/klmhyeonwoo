import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const cookieName = "blog_admin";

function expectedPassword() {
  return process.env.ADMIN_PASSWORD ?? "";
}

function sessionValue() {
  const password = expectedPassword();
  return password ? createHmac("sha256", password).update("blog-admin-v1").digest("base64url") : "";
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function passwordsMatch(password: string) {
  return Boolean(expectedPassword()) && safeEqual(password, expectedPassword());
}

export async function isAdmin() {
  const session = sessionValue();
  return Boolean(session) && safeEqual((await cookies()).get(cookieName)?.value ?? "", session);
}

export async function login() {
  (await cookies()).set(cookieName, sessionValue(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function logout() {
  (await cookies()).delete(cookieName);
}

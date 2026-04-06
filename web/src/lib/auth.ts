import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { UserRole } from "./schema";

const COOKIE_NAME = "smarttodo_session";

type SessionPayload = {
  sub: string;
  role: UserRole;
  username: string;
};

function jwtSecret() {
  if (!process.env.AUTH_JWT_SECRET) throw new Error("AUTH_JWT_SECRET is missing.");
  return process.env.AUTH_JWT_SECRET;
}

export async function hashPassword(raw: string) {
  return bcrypt.hash(raw, 12);
}

export async function verifyPassword(raw: string, hash: string) {
  return bcrypt.compare(raw, hash);
}

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: "7d" });
}

export function verifySession(token: string) {
  return jwt.verify(token, jwtSecret()) as SessionPayload;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function readSessionFromCookie() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifySession(token);
  } catch {
    return null;
  }
}

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const COOKIE_USER = "ph_session";
const COOKIE_ADMIN = "ph_admin";
const EXPIRY_DAYS = 30;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(s);
}

export async function signUserToken(email: string, code: string) {
  return new SignJWT({ sub: email, code, role: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRY_DAYS}d`)
    .sign(secret());
}

export async function signAdminToken() {
  return new SignJWT({ sub: "admin", role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}

export const cookieName = { user: COOKIE_USER, admin: COOKIE_ADMIN };

export const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * EXPIRY_DAYS,
};

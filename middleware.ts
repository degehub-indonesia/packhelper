import { NextRequest, NextResponse } from "next/server";
import { verifyToken, cookieName } from "@/lib/auth";

const PUBLIC = ["/login", "/api/auth", "/favicon.ico", "/_next"];
const ADMIN_PATHS = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (pathname === "/admin/login") return NextResponse.next();
    const adminToken = req.cookies.get(cookieName.admin)?.value;
    if (!adminToken) return NextResponse.redirect(new URL("/admin/login", req.url));
    const payload = await verifyToken(adminToken);
    if (!payload || payload.role !== "admin")
      return NextResponse.redirect(new URL("/admin/login", req.url));
    return NextResponse.next();
  }

  const token = req.cookies.get(cookieName.user)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.redirect(new URL("/login", req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

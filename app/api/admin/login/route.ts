import { NextRequest, NextResponse } from "next/server";
import { signAdminToken, cookieName } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password || password !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Password salah." }, { status: 401 });

  const token = await signAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName.admin, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}

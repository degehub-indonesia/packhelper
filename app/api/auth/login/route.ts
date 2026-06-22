import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS, type CodeMeta } from "@/lib/redis";
import { signUserToken, cookieName, cookieOpts } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();

  if (!email || !code)
    return NextResponse.json({ error: "Email dan kode akses wajib diisi." }, { status: 400 });

  const normalized = (code as string).trim().toUpperCase();
  const valid = await redis.sismember(KEYS.codes, normalized);
  if (!valid)
    return NextResponse.json({ error: "Kode akses tidak valid atau sudah dicabut." }, { status: 401 });

  const meta: CodeMeta | null = await redis.get(KEYS.code(normalized));
  if (meta && !meta.firstUsedBy) {
    await redis.set(KEYS.code(normalized), {
      ...meta,
      firstUsedBy: email,
      firstUsedAt: new Date().toISOString(),
    });
  }

  const token = await signUserToken(email.trim().toLowerCase(), normalized);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName.user, token, cookieOpts);
  return res;
}

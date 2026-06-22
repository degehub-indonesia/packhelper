import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { signUserToken, cookieName, cookieOpts } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();

  if (!email || !code)
    return NextResponse.json({ error: "Email dan kode akses wajib diisi." }, { status: 400 });

  const normalized = (code as string).trim().toUpperCase();
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("access_codes")
    .select("*")
    .eq("code", normalized)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Kode akses tidak valid atau sudah dicabut." }, { status: 401 });

  if (!data.first_used_by) {
    await supabase
      .from("access_codes")
      .update({ first_used_by: email.trim().toLowerCase(), first_used_at: new Date().toISOString() })
      .eq("code", normalized);
  }

  const token = await signUserToken(email.trim().toLowerCase(), normalized);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName.user, token, cookieOpts);
  return res;
}

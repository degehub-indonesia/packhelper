import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import { nanoid } from "@/lib/codegen";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("access_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const { label, count = 1 } = await req.json();
  const rows = Array.from({ length: Math.min(count, 50) }, () => ({
    code: `PH-${nanoid(4)}-${nanoid(4)}`,
    label: label || "",
  }));

  const { data, error } = await supabase.from("access_codes").insert(rows).select("code");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ created: data?.map((r) => r.code) ?? [] });
}

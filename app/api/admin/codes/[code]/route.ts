import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS } from "@/lib/redis";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  await redis.srem(KEYS.codes, code);
  await redis.del(KEYS.code(code));
  return NextResponse.json({ ok: true });
}

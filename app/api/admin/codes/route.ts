import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS, type CodeMeta } from "@/lib/redis";
import { nanoid } from "@/lib/codegen";

export async function GET() {
  const codes: string[] = await redis.smembers(KEYS.codes);
  const entries = await Promise.all(
    codes.map(async (code) => {
      const meta: CodeMeta | null = await redis.get(KEYS.code(code));
      return { code, ...(meta ?? { label: "", createdAt: "" }) };
    })
  );
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const { label, count = 1 } = await req.json();
  const created: string[] = [];

  for (let i = 0; i < Math.min(count, 50); i++) {
    const code = `PH-${nanoid(4)}-${nanoid(4)}`;
    const meta: CodeMeta = { label: label || "", createdAt: new Date().toISOString() };
    await redis.sadd(KEYS.codes, code);
    await redis.set(KEYS.code(code), meta);
    created.push(code);
  }

  return NextResponse.json({ created });
}

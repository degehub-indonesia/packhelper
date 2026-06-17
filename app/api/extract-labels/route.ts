import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const EXTRACT_PROMPT = `Kamu adalah sistem ekstraksi data otomatis dari label resi pengiriman marketplace Indonesia (Tokopedia, Shopee, Lazada, TikTok Shop, dll).

Dokumen ini mungkin berisi SATU atau BEBERAPA label resi sekaligus.

Tugasmu: identifikasi semua label resi, lalu ekstrak:
1. Nomor resi/tracking
2. Nama pembeli/penerima
3. Daftar barang yang dipesan beserta jumlahnya

Kembalikan dalam format JSON array (satu objek per label):
[
  {
    "resi": "nomor tracking (contoh: TKP1234567890, JNE1234567890)",
    "buyer": "nama penerima",
    "items": [
      {"name": "nama produk", "qty": jumlah_angka}
    ]
  }
]

Aturan wajib:
- Jika tidak ada label resi yang dapat dibaca, kembalikan []
- Qty default 1 jika tidak tertulis eksplisit
- Kembalikan HANYA JSON valid, tanpa markdown code block, tanpa teks tambahan
- Nama produk gunakan apa yang tertera di label`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const files = formData.getAll("files") as File[];
  if (!files.length) {
    return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const allOrders: unknown[] = [];

  for (const file of files) {
    try {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mime = file.type;

      const isImage = mime.startsWith("image/") && mime !== "image/svg+xml";
      const isPdf = mime === "application/pdf";

      if (!isImage && !isPdf) continue;

      const result = await model.generateContent([
        EXTRACT_PROMPT,
        { inlineData: { data: base64, mimeType: mime } },
      ]);

      const text = result.response.text().trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        const match = text.match(/\[[\s\S]*\]/);
        parsed = match ? JSON.parse(match[0]) : [];
      }

      if (Array.isArray(parsed)) allOrders.push(...parsed);
    } catch (err) {
      console.error(`[extract-labels] Error on file "${file.name}":`, err);
    }
  }

  return NextResponse.json({ orders: allOrders });
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const PROMPT = `Kamu adalah sistem ekstraksi data dari dokumen Packing List marketplace Indonesia (Tokopedia, Shopee, dll).

Dokumen ini berisi BANYAK pesanan. Setiap pesanan punya nomor resi/tracking dan daftar produk.

Tugasmu: ekstrak semua pesanan dengan resi dan produknya.

Kembalikan dalam format JSON array (satu objek per baris produk per pesanan):
[
  {"resi": "6 digit terakhir nomor tracking", "name": "nama lengkap produk", "qty": jumlah_angka}
]

Aturan:
- resi = 6 digit TERAKHIR dari nomor tracking/resi pengiriman
- name = nama produk selengkap mungkin (gunakan nama produk atau Seller SKU, bukan variant seperti warna/ukuran saja)
- qty harus angka (integer), bukan string
- Jika satu pesanan punya 3 produk, buat 3 objek dengan resi yang sama
- Kembalikan HANYA JSON valid, tanpa markdown code block, tanpa teks tambahan
- Jika tidak ada data, kembalikan []`;

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

  const file = formData.get("file") as File;
  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Upload file PDF Packing List." }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent([
      PROMPT,
      { inlineData: { data: base64, mimeType: "application/pdf" } },
    ]);

    const text = result.response.text().trim();

    let orders: unknown;
    try {
      orders = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      orders = match ? JSON.parse(match[0]) : [];
    }

    if (!Array.isArray(orders) || !orders.length) {
      return NextResponse.json({ error: "Tidak ada order yang ditemukan di Packing List." }, { status: 422 });
    }

    return NextResponse.json({ orders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[parse-packing]", msg);
    return NextResponse.json({ error: `Gagal membaca Packing List: ${msg}` }, { status: 500 });
  }
}

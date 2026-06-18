import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const PROMPT = `Kamu adalah sistem ekstraksi data dari dokumen Picking List marketplace Indonesia (Tokopedia, Shopee, dll).

Tugasmu: ekstrak semua produk yang perlu diambil dari gudang beserta total qty-nya.

Kembalikan dalam format JSON array:
[
  {"name": "nama/SKU produk", "sku": "nama/SKU produk", "qty": jumlah_total_angka}
]

Aturan:
- Gunakan Seller SKU sebagai name dan sku (bukan variant SKU)
- Jika produk muncul lebih dari sekali, jumlahkan qty-nya
- qty harus angka (integer), bukan string
- Kembalikan HANYA JSON valid, tanpa markdown code block, tanpa teks tambahan
- Jika tidak ada produk ditemukan, kembalikan []`;

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
    return NextResponse.json({ error: "Upload file PDF Picking List." }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent([
      PROMPT,
      { inlineData: { data: base64, mimeType: "application/pdf" } },
    ]);

    const text = result.response.text().trim();

    let products: unknown;
    try {
      products = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      products = match ? JSON.parse(match[0]) : [];
    }

    if (!Array.isArray(products) || !products.length) {
      return NextResponse.json({ error: "Tidak ada produk yang ditemukan di Picking List." }, { status: 422 });
    }

    return NextResponse.json({ products });
  } catch (err) {
    console.error("[parse-picking]", err);
    return NextResponse.json({ error: "Gagal membaca Picking List." }, { status: 500 });
  }
}

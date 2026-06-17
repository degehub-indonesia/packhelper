import { PDFParse } from "pdf-parse";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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
    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const products = parsePickingList(textResult.text);

    if (!products.length) {
      return NextResponse.json({ error: "Tidak ada produk yang ditemukan di Picking List." }, { status: 422 });
    }

    return NextResponse.json({ products });
  } catch (err) {
    console.error("[parse-picking]", err);
    return NextResponse.json({ error: "Gagal membaca Picking List." }, { status: 500 });
  }
}

interface Product { name: string; sku: string; qty: number }

function parsePickingList(text: string): Product[] {
  const products: Product[] = [];

  // Each product row format: "variantSKU\tsellerSKU\tqty\t18-digit-orderID"
  // e.g. "Abu-Abu\tKain-Abu\t6\t584364320264717874"
  // e.g. "Default\tScreen Care\t29\t584363881664119940"
  const rowPattern = /^([^\t\n]+?)\s*\t([^\t\n]+?)\s*\t(\d{1,4})\s*\t\d{18}/gm;

  for (const match of text.matchAll(rowPattern)) {
    const variantSKU = match[1].trim();
    const sellerSKU = match[2].trim();
    const qty = parseInt(match[3], 10);

    if (!sellerSKU || qty <= 0) continue;

    products.push({ name: sellerSKU, sku: sellerSKU, qty });
  }

  return products;
}

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
    return NextResponse.json({ error: "Upload file PDF Packing List." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const orders = parsePackingList(textResult.text);

    if (!orders.length) {
      return NextResponse.json({ error: "Tidak ada order yang ditemukan di Packing List." }, { status: 422 });
    }

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("[parse-packing]", err);
    return NextResponse.json({ error: "Gagal membaca Packing List." }, { status: 500 });
  }
}

interface PackingOrder { resi: string; sku: string; qty: number }

function parsePackingList(text: string): PackingOrder[] {
  const orders: PackingOrder[] = [];

  // Split text into per-page blocks using the page separator "-- N of M --"
  const pages = text.split(/--\s*\d+\s*of\s*\d+\s*--/);

  for (const page of pages) {
    // Extract resi: last 6 digits of tracking number
    const trackingMatch = page.match(/Tracking number:(\S+)/);
    if (!trackingMatch) continue;
    const resi = trackingMatch[1].slice(-6);

    // Extract product rows: "variantSKU\tsellerSKU\tqty" (NO 18-digit order ID after)
    // Format: e.g. "Default\tScreen Care\t1" or "Abu-Abu\tKain-Abu\t2"
    const rowPattern = /^([^\t\n]+)\t([^\t\n]+)\t(\d{1,4})$/gm;

    for (const match of page.matchAll(rowPattern)) {
      const sellerSKU = match[2].trim();
      const qty = parseInt(match[3], 10);

      if (!sellerSKU || qty <= 0) continue;

      // Skip header row
      if (sellerSKU === "Seller SKU") continue;

      orders.push({ resi, sku: sellerSKU, qty });
    }
  }

  return orders;
}

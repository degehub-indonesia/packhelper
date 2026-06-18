"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  ArrowLeft, Package, Upload, X, Loader2, Printer,
  RotateCcw, AlertCircle, Boxes, ClipboardList,
  Check, FileText,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface RawPackingOrder { resi: string; name: string; qty: number }
interface OrderItem { name: string; qty: number }
interface ExtractedOrder { id: string; resi: string; items: OrderItem[] }
type Phase = "upload" | "processing" | "results";

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function genId() { return Math.random().toString(36).slice(2, 10); }

function computeRecap(orders: ExtractedOrder[]) {
  const map = new Map<string, { totalQty: number; orderCount: number }>();
  for (const o of orders) {
    for (const item of o.items) {
      const ex = map.get(item.name);
      if (ex) { ex.totalQty += item.qty; ex.orderCount += 1; }
      else { map.set(item.name, { totalQty: item.qty, orderCount: 1 }); }
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.totalQty - a.totalQty);
}

/* ─── FilePicker ─────────────────────────────────────────────────────────────── */

function FilePicker({
  label, hint, file, onFile, onClear,
}: {
  label: string; hint: string;
  file: File | null; onFile: (f: File) => void; onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const accept = (incoming: File | null) => {
    if (incoming && incoming.type === "application/pdf") onFile(incoming);
  };

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-stone-700 mb-2 uppercase tracking-wide">{label}</p>

      {file ? (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="flex-1 text-sm text-emerald-800 font-medium truncate">{file.name}</span>
          <button
            onClick={onClear}
            className="p-1 rounded-lg hover:bg-emerald-100 text-emerald-400 hover:text-emerald-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files[0] ?? null); }}
          onClick={() => ref.current?.click()}
          className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
            drag ? "border-emerald-500 bg-emerald-50" : "border-stone-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30"
          }`}
        >
          <Upload className={`w-5 h-5 ${drag ? "text-emerald-600" : "text-stone-400"}`} />
          <p className="text-xs text-stone-500 text-center leading-relaxed">{hint}</p>
          <input
            ref={ref}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => accept(e.target.files?.[0] ?? null)}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────────── */

export default function PackHelperPage() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [packingFile, setPackingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [orders, setOrders] = useState<ExtractedOrder[]>([]);
  const [packedItems, setPackedItems] = useState<Record<string, Record<number, boolean>>>({});
  const [pickedItems, setPickedItems] = useState<Set<string>>(new Set());
  const [printDate, setPrintDate] = useState("");

  useEffect(() => {
    setPrintDate(new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }));
  }, []);

  const recap = computeRecap(orders);
  const allPicked = recap.length > 0 && recap.every((r) => pickedItems.has(r.name));

  const isOrderComplete = useCallback((order: ExtractedOrder) => {
    const state = packedItems[order.id] ?? {};
    return order.items.every((_, i) => !!state[i]);
  }, [packedItems]);

  const completedCount = orders.filter(isOrderComplete).length;
  const totalUnits = recap.reduce((s, r) => s + r.totalQty, 0);

  /* ── Submit ─────────────────────────────────────────────────────────────── */

  const handleSubmit = async () => {
    if (!packingFile) return;
    setPhase("processing");
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", packingFile);

      const res = await fetch("/api/parse-packing", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Error ${res.status}`);

      const { orders: rawOrders } = json;

      if (!Array.isArray(rawOrders) || !rawOrders.length) {
        setError("Tidak ada data yang berhasil diekstrak. Pastikan file yang diupload benar.");
        setPhase("upload");
        return;
      }

      const orderMap: Record<string, ExtractedOrder> = {};
      (rawOrders as RawPackingOrder[]).forEach((o) => {
        if (!orderMap[o.resi]) {
          orderMap[o.resi] = { id: genId(), resi: o.resi, items: [] };
        }
        orderMap[o.resi].items.push({ name: o.name, qty: o.qty });
      });

      const builtOrders = Object.values(orderMap);
      setOrders(builtOrders);
      setPickedItems(new Set());
      setPackedItems({});
      setPhase("results");
    } catch (err) {
      console.error("[packhelper]", err);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses file. Coba lagi.");
      setPhase("upload");
    }
  };

  const reset = () => {
    setPhase("upload");
    setPackingFile(null);
    setOrders([]);
    setPickedItems(new Set());
    setPackedItems({});
    setError(null);
  };

  const togglePick = (name: string) =>
    setPickedItems((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const togglePack = (orderId: string, itemIdx: number) =>
    setPackedItems((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] ?? {}), [itemIdx]: !(prev[orderId]?.[itemIdx]) },
    }));

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="print:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="https://degehub.id"
              className="group flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
              <span className="hidden sm:inline font-medium">DegeHub</span>
            </a>
            <div className="w-px h-4 bg-stone-200 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#064e3b] to-[#022c22] flex items-center justify-center shadow-sm">
                <Package className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <span className="font-bold text-stone-900 text-sm tracking-tight">PackHelper</span>
              <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full border border-stone-200/60 hidden sm:inline-block">
                Warehouse Edition
              </span>
            </div>
          </div>

          {phase === "results" && (
            <div className="hidden md:flex items-center gap-5 text-xs">
              <span className="text-stone-400">
                {orders.length} pesanan · {recap.length} jenis · {totalUnits} unit
              </span>
              <span className={`font-mono font-bold tabular-nums ${completedCount === orders.length ? "text-emerald-700" : "text-stone-600"}`}>
                Packed: {completedCount}/{orders.length}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ══════════════ UPLOAD PHASE ══════════════ */}
      {phase === "upload" && (
        <main className="print:hidden max-w-2xl mx-auto px-4 sm:px-6 py-14">

          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#064e3b] to-[#022c22] flex items-center justify-center shadow-xl shadow-emerald-950/20 mx-auto mb-5">
              <Package className="w-8 h-8 text-emerald-300" />
            </div>
            <h1 className="text-2xl font-black text-stone-900 mb-2 tracking-tight">PackHelper</h1>
            <p className="text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">
              Upload Packing List dari Tokopedia. AI akan otomatis menyusun rekap stok dan daftar packing per resi.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 leading-snug">{error}</p>
            </div>
          )}

          <div className="bg-white border border-stone-200/60 rounded-2xl p-5 shadow-sm mb-4">
            <FilePicker
              label="Packing List"
              hint="PDF Packing List dari Tokopedia / Shopee"
              file={packingFile}
              onFile={setPackingFile}
              onClear={() => setPackingFile(null)}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!packingFile}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#064e3b] to-emerald-700 hover:from-emerald-800 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-950/20"
          >
            <Package className="w-4 h-4" />
            Proses dengan AI
          </button>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { step: "1", title: "Upload 1 File", desc: "Cukup Packing List — AI baca semua yang diperlukan" },
              { step: "2", title: "AI Proses", desc: "AI ekstrak nama produk, qty, dan resi dari dokumen" },
              { step: "3", title: "Picking & Packing", desc: "Centang stok & verifikasi setiap paket sebelum kirim" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-white border border-stone-200/60 rounded-2xl p-4 text-center">
                <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black flex items-center justify-center mx-auto mb-2">
                  {step}
                </div>
                <p className="text-xs font-bold text-stone-700 mb-1">{title}</p>
                <p className="text-[11px] text-stone-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ══════════════ PROCESSING PHASE ══════════════ */}
      {phase === "processing" && (
        <main className="print:hidden flex items-center justify-center min-h-[70vh]">
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#064e3b] to-[#022c22] flex items-center justify-center shadow-xl shadow-emerald-950/20 mx-auto">
              <Loader2 className="w-8 h-8 text-emerald-300 animate-spin" />
            </div>
            <div>
              <p className="font-bold text-stone-800 mb-1">AI sedang memproses dokumen…</p>
              <p className="text-sm text-stone-400">Membaca Packing List, harap tunggu</p>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </main>
      )}

      {/* ══════════════ RESULTS PHASE ══════════════ */}
      {phase === "results" && (
        <main className="print:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="font-bold text-stone-900 text-sm">{orders.length} Pesanan Ditemukan</h2>
              <p className="text-xs text-stone-400 mt-0.5">
                {recap.length} jenis item &middot; {totalUnits} total unit
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-xl transition-colors font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload Baru</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs text-white bg-[#064e3b] hover:bg-emerald-800 px-3 py-2 rounded-xl transition-colors font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cetak PDF</span>
              </button>
            </div>
          </div>

          <div className="mb-5 bg-white rounded-2xl border border-stone-200/60 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-stone-500">Progress Packing</span>
              <span className="text-xs font-bold font-mono text-stone-800">
                {completedCount}/{orders.length} selesai
              </span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#064e3b] to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: orders.length > 0 ? `${(completedCount / orders.length) * 100}%` : "0%" }}
              />
            </div>
            {allPicked && completedCount === orders.length && (
              <p className="text-xs text-emerald-700 font-semibold mt-2.5 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Semua pesanan selesai dipacking! Siap kirim.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-5 items-start">

            {/* LEFT: Rekap Stok */}
            <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
                <div className="p-1.5 rounded-lg bg-emerald-50">
                  <Boxes className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-stone-800">Rekap Stok — Ambil dari Gudang</h3>
                  <p className="text-xs text-stone-400">Centang setelah diambil dari rak</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  allPicked ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-stone-100 text-stone-500 border-stone-200"
                }`}>
                  {pickedItems.size}/{recap.length}
                </span>
              </div>

              <div className="divide-y divide-stone-50">
                {recap.map((item) => {
                  const picked = pickedItems.has(item.name);
                  return (
                    <button
                      key={item.name}
                      onClick={() => togglePick(item.name)}
                      className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-stone-50 transition-colors ${picked ? "bg-emerald-50/50" : ""}`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        picked ? "bg-emerald-600 border-emerald-600" : "border-stone-300 hover:border-emerald-400"
                      }`}>
                        {picked && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`flex-1 text-sm font-medium leading-snug transition-colors ${
                        picked ? "text-stone-400 line-through decoration-stone-300" : "text-stone-800"
                      }`}>
                        {item.name}
                      </span>
                      <div className="text-right shrink-0">
                        <p className={`font-mono text-base font-black tabular-nums ${picked ? "text-stone-300" : "text-emerald-700"}`}>
                          ×&thinsp;{item.totalQty}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">{item.orderCount} pesanan</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/60 flex items-center justify-between">
                <span className="text-xs text-stone-500">Total semua item</span>
                <span className="font-mono text-sm font-black text-stone-700 tabular-nums">{totalUnits} unit</span>
              </div>
            </div>

            {/* RIGHT: Daftar Pesanan */}
            <div className="sticky top-[57px] bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
                <div className="p-1.5 rounded-lg bg-emerald-50">
                  <ClipboardList className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-stone-800">Daftar Pesanan</h3>
                  <p className="text-xs text-stone-400">Centang saat memasukkan ke paket</p>
                </div>
              </div>

              <div className="max-h-[calc(100vh-240px)] overflow-y-auto divide-y divide-stone-50">
                {orders.map((order, oi) => {
                  const complete = isOrderComplete(order);
                  const packedState = packedItems[order.id] ?? {};
                  const packedCount = Object.values(packedState).filter(Boolean).length;

                  return (
                    <div key={order.id} className={`p-4 transition-colors ${complete ? "bg-emerald-50/40" : ""}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="text-[11px] font-mono font-bold text-stone-400 tracking-wide">
                          #{oi + 1} · Resi: {order.resi}
                        </p>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                          complete
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-stone-100 text-stone-500 border-stone-200"
                        }`}>
                          {complete ? "✓ Packed" : `${packedCount}/${order.items.length}`}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {order.items.map((item, idx) => {
                          const checked = !!packedState[idx];
                          return (
                            <button
                              key={idx}
                              onClick={() => togglePack(order.id, idx)}
                              className={`w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg transition-colors hover:bg-stone-100 ${
                                checked ? "bg-emerald-50 hover:bg-emerald-100/70" : ""
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                checked ? "bg-emerald-600 border-emerald-600" : "border-stone-300"
                              }`}>
                                {checked && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className={`flex-1 text-xs leading-snug ${checked ? "line-through text-stone-400" : "text-stone-700"}`}>
                                {item.name}
                              </span>
                              <span className={`font-mono text-xs font-bold shrink-0 ${checked ? "text-stone-300" : "text-stone-600"}`}>
                                ×{item.qty}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ══════════════ PRINT AREA ══════════════ */}
      <div className="hidden print:block p-8 text-sm">
        <div className="mb-8 pb-4 border-b-2 border-black">
          <h1 className="text-2xl font-bold">PackHelper — Rekap Pengiriman</h1>
          <p className="text-gray-500 mt-1">
            Dicetak: {printDate} &nbsp;|&nbsp;
            {orders.length} pesanan &nbsp;|&nbsp; {recap.length} jenis item &nbsp;|&nbsp; {totalUnits} unit
          </p>
        </div>

        <h2 className="text-base font-bold mb-3">1. Rekap Stok — Ambil dari Gudang</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "32px", fontSize: "12px" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ border: "1px solid #d1d5db", padding: "6px 10px", textAlign: "left" }}>No</th>
              <th style={{ border: "1px solid #d1d5db", padding: "6px 10px", textAlign: "left" }}>Nama Barang</th>
              <th style={{ border: "1px solid #d1d5db", padding: "6px 10px", textAlign: "center" }}>Total Ambil</th>
              <th style={{ border: "1px solid #d1d5db", padding: "6px 10px", textAlign: "center", width: "80px" }}>✓</th>
            </tr>
          </thead>
          <tbody>
            {recap.map((item, i) => (
              <tr key={item.name}>
                <td style={{ border: "1px solid #d1d5db", padding: "6px 10px" }}>{i + 1}</td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px 10px", fontWeight: 600 }}>{item.name}</td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px 10px", textAlign: "center", fontWeight: 700 }}>{item.totalQty}</td>
                <td style={{ border: "1px solid #d1d5db", padding: "6px 10px", textAlign: "center" }}>□</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-base font-bold mb-3">2. Rincian Per Pesanan — Verifikasi Packing</h2>
        {orders.map((order, oi) => (
          <div key={order.id} style={{ marginBottom: "20px", border: "1px solid #d1d5db", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ background: "#f3f4f6", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>#{oi + 1} &nbsp;·&nbsp; Resi: {order.resi}</span>
              <span style={{ fontSize: "11px" }}>Nama Packer: ___________________</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={{ borderTop: "1px solid #e5e7eb", padding: "5px 12px", textAlign: "left", color: "#6b7280", fontWeight: 500 }}>Barang</th>
                  <th style={{ borderTop: "1px solid #e5e7eb", padding: "5px 12px", textAlign: "center", color: "#6b7280", fontWeight: 500, width: "60px" }}>Qty</th>
                  <th style={{ borderTop: "1px solid #e5e7eb", padding: "5px 12px", textAlign: "center", color: "#6b7280", fontWeight: 500, width: "60px" }}>✓</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, ii) => (
                  <tr key={ii} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "5px 12px" }}>{item.name}</td>
                    <td style={{ padding: "5px 12px", textAlign: "center", fontWeight: 600 }}>{item.qty}</td>
                    <td style={{ padding: "5px 12px", textAlign: "center" }}>□</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <p style={{ marginTop: "40px", fontSize: "10px", color: "#9ca3af", textAlign: "center" }}>
          Dokumen ini dibuat otomatis oleh PackHelper · degehub.id
        </p>
      </div>

    </div>
  );
}

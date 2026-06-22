"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Copy, Check, RefreshCw, LogOut, Package } from "lucide-react";

interface CodeEntry {
  code: string;
  label: string;
  createdAt: string;
  firstUsedBy?: string;
  firstUsedAt?: string;
}

function fmt(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminPage() {
  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/codes");
      setCodes(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), count }),
      });
      const data = await res.json();
      if (data.created?.length) {
        await fetchCodes();
        setLabel("");
        setCount(1);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function revoke(code: string) {
    if (!confirm(`Cabut kode ${code}? User yang pakai kode ini tidak bisa login lagi.`)) return;
    setDeleting(code);
    try {
      await fetch(`/api/admin/codes/${code}`, { method: "DELETE" });
      setCodes((prev) => prev.filter((c) => c.code !== code));
    } finally {
      setDeleting(null);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const filtered = codes.filter(
    (c) =>
      c.code.includes(search.toUpperCase()) ||
      c.label?.toLowerCase().includes(search.toLowerCase()) ||
      c.firstUsedBy?.toLowerCase().includes(search.toLowerCase())
  );

  const usedCount = codes.filter((c) => c.firstUsedBy).length;

  return (
    <div className="min-h-screen bg-[#0a0f0a] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">PackHelper</p>
            <p className="text-[10px] text-white/30">Admin Panel</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Keluar
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Kode", value: codes.length },
            { label: "Sudah Dipakai", value: usedCount },
            { label: "Belum Dipakai", value: codes.length - usedCount },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <p className="text-2xl font-black text-white">{value}</p>
              <p className="text-xs text-white/30 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Generate */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-white">Generate Kode Baru</h2>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (nama buyer / order ID)"
              className="flex-1 min-w-48 bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/40">Jumlah</label>
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-16 bg-white/[0.05] border border-white/[0.10] rounded-xl px-3 py-2.5 text-sm text-white text-center focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all"
            >
              {generating ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Generate
            </button>
          </div>
        </div>

        {/* Code List */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white">Daftar Kode Akses</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode / label / email..."
                className="bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/40 transition-all w-52"
              />
              <button
                onClick={fetchCodes}
                className="p-2 text-white/30 hover:text-white/60 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-white/20 text-sm">Memuat...</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-white/20 text-sm">
              {codes.length === 0 ? "Belum ada kode. Generate dulu di atas." : "Tidak ada hasil."}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((entry) => (
                <div
                  key={entry.code}
                  className={`flex items-center gap-3 bg-white/[0.025] border rounded-xl px-4 py-3 transition-all ${
                    entry.firstUsedBy
                      ? "border-emerald-500/[0.15] bg-emerald-950/20"
                      : "border-white/[0.06]"
                  }`}
                >
                  {/* Code */}
                  <span className="font-mono text-sm font-bold text-white tracking-widest w-32 shrink-0">
                    {entry.code}
                  </span>

                  {/* Label */}
                  <span className="text-xs text-white/40 flex-1 truncate">
                    {entry.label || <span className="italic text-white/20">tanpa label</span>}
                  </span>

                  {/* Usage */}
                  <div className="text-right shrink-0 hidden sm:block">
                    {entry.firstUsedBy ? (
                      <div>
                        <p className="text-[10px] text-emerald-400/70 font-mono truncate max-w-36">{entry.firstUsedBy}</p>
                        <p className="text-[10px] text-white/25">{fmt(entry.firstUsedAt!)}</p>
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/20 italic">Belum dipakai</span>
                    )}
                  </div>

                  {/* Created */}
                  <span className="text-[10px] text-white/20 shrink-0 hidden md:block w-20 text-right">
                    {fmt(entry.createdAt)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyCode(entry.code)}
                      className="p-1.5 text-white/25 hover:text-emerald-400 transition-colors rounded-lg hover:bg-emerald-500/10"
                      title="Copy kode"
                    >
                      {copied === entry.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => revoke(entry.code)}
                      disabled={deleting === entry.code}
                      className="p-1.5 text-white/25 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10 disabled:opacity-40"
                      title="Cabut kode"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

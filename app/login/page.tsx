"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Zap, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push("/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f0a] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-xl font-black text-white">PackHelper</h1>
          <p className="text-xs text-white/30 mt-1">Masuk dengan kode akses kamu</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              className="bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.07] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Kode Akses</label>
            <div className="relative">
              <input
                type={showCode ? "text" : "password"}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PH-XXXX-XXXX"
                className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/20 font-mono tracking-widest focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.07] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !code}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm px-5 py-3 rounded-xl transition-all mt-1"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>

        <p className="text-center text-xs text-white/20 mt-6">
          Belum punya kode?{" "}
          <a
            href="http://lynk.id/degehub/kzk052mm7p2y/checkout"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400/60 hover:text-emerald-400 transition-colors"
          >
            Beli di sini →
          </a>
        </p>
      </div>
    </div>
  );
}

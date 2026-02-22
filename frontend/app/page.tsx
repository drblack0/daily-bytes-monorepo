"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

const CORRECT_PASSWORD = "THICKTHIGHS100";
const SESSION_KEY = "db_auth";

export default function PasswordGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  // If already authenticated, skip straight to dashboard
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      // Set a session cookie so the middleware can also verify auth
      document.cookie = "db_auth=1; path=/; SameSite=Strict";
      router.push("/dashboard");
    } else {
      setError(true);
      setShake(true);
      setPassword("");
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div
        className={`w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm shadow-2xl shadow-black/40 transition-transform ${
          shake ? "animate-shake" : ""
        }`}
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20">
            <Lock className="h-6 w-6 text-indigo-400" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-xl font-semibold text-white">Daily Bytes</h1>
          <p className="mt-1 text-sm text-slate-500">Enter the password to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Password"
              autoFocus
              className={`w-full rounded-xl border bg-white/5 py-3 pl-4 pr-11 text-sm text-white placeholder-slate-600 outline-none ring-0 transition ${
                error
                  ? "border-red-500/60 focus:ring-2 focus:ring-red-500/30"
                  : "border-white/10 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/30"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Incorrect password. Please try again.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 active:scale-[0.98]"
          >
            Unlock
          </button>
        </form>
      </div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.45s ease; }
      `}</style>
    </main>
  );
}

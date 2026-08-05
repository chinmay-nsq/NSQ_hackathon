"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { ApiRequestError } from "@/lib/api";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuthStore();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-95"
      >
        <div className="mb-10 text-center">
          <p className="label-caps text-[11px] text-accent mb-3">Kingdom Command Center</p>
          <h1 className="font-display text-4xl">Weatherline</h1>
        </div>

        <div className="border border-line bg-card">
          <div className="flex border-b border-line">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-3 text-sm transition-colors relative ${
                mode === "login" ? "text-accent" : "text-fg-muted hover:text-fg"
              }`}
            >
              Sign In
              {mode === "login" && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent" />}
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-3 text-sm transition-colors relative ${
                mode === "register" ? "text-accent" : "text-fg-muted hover:text-fg"
              }`}
            >
              Register
              {mode === "register" && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent" />}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {mode === "register" && (
              <div>
                <label className="label-caps text-[10px] text-fg-muted block mb-1.5">Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-bg-deep border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <label className="label-caps text-[10px] text-fg-muted block mb-1.5">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg-deep border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="label-caps text-[10px] text-fg-muted block mb-1.5">Password</label>
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-deep border border-line px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            {error && <p className="text-sm text-accent">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-accent text-bg font-medium text-sm hover:bg-accent-bright transition-colors disabled:opacity-50"
            >
              {submitting ? "Please wait…" : mode === "login" ? "Enter the Kingdom" : "Take the Oath"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

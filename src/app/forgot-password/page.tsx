"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setDevCode("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to request password reset");
      }

      setMessage(data.message || "Codice di reset inviato alla tua email.");
      if (data.dev && data.code) {
        setDevCode(data.code);
      }
    } catch (err) {
      setError((err as Error).message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Reset Password</h1>
            <p className="text-slate-500 mt-2">
              Inserisci la tua email per ricevere un codice di reset
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
              {error}
            </div>
          )}

          {message ? (
            <div className="space-y-4">
              <div className="p-6 bg-primary-50 border border-primary-200 rounded-xl text-center">
                <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3" />
                <p className="font-medium text-slate-900">{message}</p>
                <p className="text-sm text-slate-500 mt-2">
                  Controlla la tua casella di posta e inserisci il codice nella pagina successiva.
                </p>
              </div>

              {devCode && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <p className="text-xs font-medium text-amber-700 mb-2">⚡ Modalità sviluppo</p>
                  <div className="text-3xl font-mono font-bold text-amber-700 tracking-[0.3em]">
                    {devCode}
                  </div>
                </div>
              )}

              <Link
                href={`/reset-password?email=${encodeURIComponent(email)}`}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/25"
              >
                Inserisci codice
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                onClick={() => { setMessage(""); setDevCode(""); }}
                className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
              >
                Invia di nuovo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition text-slate-900 placeholder-slate-400 bg-white"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Invia codice di reset"
                )}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Ricordi la password?{" "}
            <Link href="/login" className="font-medium text-primary hover:text-primary transition-colors">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

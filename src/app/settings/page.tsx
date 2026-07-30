"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  User,
  Lock,
  Save,
  Globe,
  MessageSquare,
  Send,
  Star,
  Languages,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Profile {
  name: string;
  email: string;
  hasPassword: boolean;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface Feedback {
  type: string;
  message: string;
  rating: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const { status } = useSession();
  const { language, changeLanguage, t } = useLanguage();

  const [profile, setProfile] = useState<Profile>({ name: "", email: "", hasPassword: false });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [feedback, setFeedback] = useState<Feedback>({ type: "general", message: "", rating: 0 });
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      loadAccount();
    }
  }, [status, router]);

  async function loadAccount() {
    setProfileLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load account");
      setProfile({
        name: data.user.name || "",
        email: data.user.email || "",
        hasPassword: Boolean(data.user.hasPassword),
      });
    } catch (err) {
      setError((err as Error).message || "Unable to load account settings");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleProfileSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");
    setProfileSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save profile");
      setMessage("Profilo aggiornato con successo.");
    } catch (err) {
      setError((err as Error).message || "Unable to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (passwordForm.newPassword.length < 8) {
      setError("La nuova password deve avere almeno 8 caratteri.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Le password non corrispondono.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to change password");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Password cambiata con successo.");
    } catch (err) {
      setError((err as Error).message || "Unable to change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleFeedbackSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFeedbackSaving(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedback),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to send feedback");
      setFeedbackSent(true);
      setFeedback({ type: "general", message: "", rating: 0 });
      setTimeout(() => setFeedbackSent(false), 4000);
    } catch (err) {
      setError((err as Error).message || "Unable to send feedback");
    } finally {
      setFeedbackSaving(false);
    }
  }

  if (status === "loading" || profileLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-slate-500 font-medium">Caricamento impostazioni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Impostazioni
          </h1>
          <p className="text-slate-500 mt-1">Gestisci il tuo profilo, lingua e preferenze.</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm"
          >
            {error}
          </motion.div>
        )}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 p-4 bg-sky-50 border border-sky-200 text-primary rounded-xl text-sm"
          >
            {message}
          </motion.div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 mb-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Profilo</h2>
              <p className="text-sm text-slate-500">Modifica il tuo nome pubblico</p>
            </div>
          </div>
          <form onSubmit={handleProfileSave} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Nome
              </label>
              <input
                id="name"
                type="text"
                value={profile.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition bg-white text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-3 border border-slate-100 bg-slate-50 rounded-xl text-slate-400 cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/25 disabled:opacity-60 text-sm"
            >
              {profileSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {profileSaving ? "Salvataggio..." : "Salva profilo"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 mb-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Lingua</h2>
              <p className="text-sm text-slate-500">Scegli la lingua dell&apos;interfaccia</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={language}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => changeLanguage(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition appearance-none"
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-sky-50 rounded-xl text-sm text-primary font-medium">
              <span className="text-lg">{language === "it" ? "🇮🇹" : "🇬🇧"}</span>
              {language === "it" ? "Italiano" : "English"}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 mb-6 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Sicurezza</h2>
              <p className="text-sm text-slate-500">Cambia la tua password</p>
            </div>
          </div>
          {!profile.hasPassword ? (
            <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4">
              Questo account utilizza l&apos;accesso sociale. Il cambio password non è disponibile.
            </p>
          ) : (
            <form onSubmit={handlePasswordSave} className="space-y-5">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password attuale
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition bg-white text-slate-900"
                />
              </div>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nuova password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition bg-white text-slate-900"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Conferma nuova password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition bg-white text-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={passwordSaving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/25 disabled:opacity-60 text-sm"
              >
                {passwordSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {passwordSaving ? "Aggiornamento..." : "Aggiorna password"}
              </button>
            </form>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Feedback</h2>
              <p className="text-sm text-slate-500">Aiutaci a migliorare CaptionBoost</p>
            </div>
          </div>

          {feedbackSent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-sky-50 border border-sky-200 rounded-xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Send className="w-6 h-6 text-primary" />
              </div>
              <p className="font-bold text-slate-900">Grazie per il tuo feedback!</p>
              <p className="text-sm text-slate-500 mt-1">Lo utilizzeremo per migliorare l&apos;esperienza.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-5">
              <div>
                <label htmlFor="feedbackType" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tipo
                </label>
                <select
                  id="feedbackType"
                  value={feedback.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFeedback((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                >
                  <option value="general">Suggerimento generale</option>
                  <option value="bug">Segnalazione bug</option>
                  <option value="feature">Richiesta funzionalità</option>
                  <option value="translation">Problema di traduzione</option>
                </select>
              </div>

              <div>
                <label htmlFor="feedbackRating" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Valutazione
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedback((prev) => ({ ...prev, rating: star }))}
                      className={`p-1.5 rounded-lg transition-all ${
                        feedback.rating >= star
                          ? "text-amber-400 scale-110"
                          : "text-slate-200 hover:text-slate-300"
                      }`}
                    >
                      <Star className={`w-6 h-6 ${feedback.rating >= star ? "fill-amber-400" : ""}`} />
                    </button>
                  ))}
                  {feedback.rating > 0 && (
                    <span className="ml-2 text-sm text-slate-500">
                      {feedback.rating === 1 && "Scarso"}
                      {feedback.rating === 2 && "Mediocre"}
                      {feedback.rating === 3 && "Buono"}
                      {feedback.rating === 4 && "Molto buono"}
                      {feedback.rating === 5 && "Eccellente"}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="feedbackMessage" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Il tuo messaggio
                </label>
                <textarea
                  id="feedbackMessage"
                  rows={4}
                  value={feedback.message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback((prev) => ({ ...prev, message: e.target.value }))}
                  required
                  minLength={3}
                  placeholder="Scrivi qui il tuo feedback, suggerimento o segnalazione..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={feedbackSaving || feedback.message.trim().length < 3}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/25 disabled:opacity-60 text-sm"
              >
                {feedbackSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {feedbackSaving ? "Invio in corso..." : "Invia feedback"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

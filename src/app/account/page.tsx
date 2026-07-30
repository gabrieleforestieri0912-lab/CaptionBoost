"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Subtitles,
  ExternalLink,
  Trash2,
  Clock,
  Globe,
  Video,
  ArrowLeft,
  Search,
  Loader2,
  Download,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Languages,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getYouTubeId(url: string) {
  const match = url.match(/(?:v=|\/)([\w-]{11})/);
  return match ? match[1] : null;
}

interface SubtitleLine {
  start?: number;
  end?: number;
  text: string;
}

interface Subtitle {
  id: string;
  videoTitle: string;
  videoUrl?: string;
  thumbnail?: string;
  language: string;
  lines: SubtitleLine[];
  updatedAt: string;
}

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { language, changeLanguage } = useLanguage();
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadSubtitles = useCallback(async () => {
    try {
      const res = await fetch("/api/account/subtitles");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubtitles(data.subtitles);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      loadSubtitles();
    }
  }, [status, router, loadSubtitles]);

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminare questo sottotitolo?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/account/subtitles?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSubtitles((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = (sub: Subtitle) => {
    const srtContent = sub.lines
      .map((line, i) => {
        const start = new Date(line.start || 0).toISOString().substr(11, 12).replace(".", ",");
        const end = new Date(line.end || 0).toISOString().substr(11, 12).replace(".", ",");
        return `${i + 1}\n${start} --> ${end}\n${line.text}\n`;
      })
      .join("\n");

    const blob = new Blob([srtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sub.videoTitle || "subtitles"}-${sub.language}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = subtitles.filter(
    (s) =>
      s.videoTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.language?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-slate-500 font-medium">Caricamento sottotitoli...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Torna alla home
              </Link>
              <div className="relative" ref={langMenuRef}>
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <Languages className="w-4 h-4" />
                  <span className="text-xs font-semibold tracking-wide">{language.toUpperCase()}</span>
                </button>
                {showLangMenu && (
                  <div className="absolute left-0 mt-2 w-32 bg-white border border-slate-100 rounded-2xl shadow-2xl py-2 z-50 ring-1 ring-slate-900/5">
                    {[
                      { code: "en", label: "English" },
                      { code: "it", label: "Italiano" },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          changeLanguage(lang.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                          language === lang.code
                            ? "text-primary bg-sky-50"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              I miei sottotitoli
            </h1>
            <p className="text-slate-500 mt-1">
              {subtitles.length} video salvati
              {subtitles.length > 0 &&
                ` — ${subtitles.reduce((acc: number, s: Subtitle) => acc + s.lines.length, 0)} righe totali`}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca per titolo o lingua..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {filtered.length === 0 && !loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-6">
              <Subtitles className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {searchQuery ? "Nessun risultato" : "Nessun sottotitolo salvato"}
            </h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              {searchQuery
                ? "Prova a modificare la ricerca."
                : "Installa l'estensione e abilita i sottotitoli su un video YouTube per vederli apparire qui."}
            </p>
            {!searchQuery && (
              <a
                href="https://chrome.google.com/webstore/detail/captionboost-ai-subtitles/ldjnghkdlkfjhghkldjfghlkdjfghlkdj"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary text-white font-bold transition-all shadow-lg shadow-primary/25"
              >
                <Download className="w-4 h-4" />
                Installa l&apos;estensione
              </a>
            )}
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filtered.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="hidden sm:block w-24 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 relative">
                      {sub.thumbnail ? (
                        <Image
                          src={sub.thumbnail}
                          alt={sub.videoTitle}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-slate-900 truncate max-w-md">
                            {sub.videoTitle}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {sub.language?.toUpperCase()}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Subtitles className="w-3 h-3" />
                              {sub.lines.length} righe
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(sub.updatedAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleExport(sub)}
                            className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-sky-50 transition-all"
                            title="Esporta SRT"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {sub.videoUrl && (
                            <a
                              href={sub.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-sky-50 transition-all"
                              title="Apri video"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(sub.id)}
                            disabled={deletingId === sub.id}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-50"
                            title="Elimina"
                          >
                            {deletingId === sub.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                          >
                            {expandedId === sub.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedId === sub.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 pt-4 border-t border-slate-50"
                    >
                      <div className="bg-slate-50 rounded-xl p-4 max-h-80 overflow-y-auto">
                        {sub.lines.map((line, li) => (
                          <div
                            key={li}
                            className="flex gap-3 py-2 border-b border-slate-100 last:border-0 text-sm"
                          >
                            <span className="text-slate-400 font-mono text-xs w-8 shrink-0 pt-0.5">
                              {li + 1}
                            </span>
                            <span className="text-slate-700">{line.text}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Navbar() {
  const router = useRouter();
  const { user: session, signOut } = useAuth();
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    requestAnimationFrame(() => handleScroll());
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 ${
        isScrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm shadow-slate-900/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute -inset-1 bg-primary rounded-lg blur opacity-0 group-hover:opacity-60" />
                <Image
                  src="/captionboost.png"
                  alt="CaptionBoost"
                  width={36}
                  height={36}
                  className="relative rounded-lg"
                />
              </div>
              <span className="text-lg font-bold tracking-tight">CaptionBoost</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {[
                { href: "/#features", label: t("features") },
                { href: "/pricing", label: t("pricing") },
                { href: "/#how-it-works", label: t("howItWorks") },
              ].map((link: { href: string; label: string }) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              {session ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
                  >
                    {session.image && (
                      <Image
                        src={session.image}
                        alt={session.name || "User"}
                        width={28}
                        height={28}
                        className="rounded-full ring-2 ring-slate-100"
                      />
                    )}
                    <span className="hidden sm:inline">{session.name?.split(" ")[0] || "Account"}</span>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl py-2 z-50 ring-1 ring-slate-900/5">
                      <div className="px-4 py-3 border-b border-slate-50 mb-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("account")}</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{session.email}</p>
                      </div>
                      <Link href="/settings" className="block px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50">
                        {t("settings")}
                      </Link>
                      <Link href="/account" className="block px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50">
                        {t("mySubtitles")}
                      </Link>
                      <div className="mt-1 pt-1 border-t border-slate-50">
                        <button
                          onClick={async () => { setShowUserMenu(false); await signOut(); router.push("/login"); }}
                          className="w-full text-left px-4 py-2 text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          {t("logout")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href="/signup"
                    className="px-5 py-2.5 text-sm font-bold rounded-xl bg-primary hover:bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-primary/40"
                  >
                    {t("signup")}
                  </Link>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-xl hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-2">
            {[
              { href: "/#features", label: t("features") },
              { href: "/pricing", label: t("pricing") },
              { href: "/#how-it-works", label: t("howItWorks") },
            ].map((link: { href: string; label: string }) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl"
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-2 border-slate-100" />
            {session ? (
              <>
                <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl">
                  {t("mySubtitles")}
                </Link>
                <Link href="/settings" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl">
                  {t("settings")}
                </Link>
                <button onClick={async () => { setMobileMenuOpen(false); await signOut(); router.push("/login"); }} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl">
                  {t("logout")}
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl border border-slate-200">
                  {t("login")}
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center px-4 py-3 text-sm font-bold rounded-xl bg-primary text-white">
                  {t("signup")}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

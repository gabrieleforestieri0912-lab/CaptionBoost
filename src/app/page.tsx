"use client";

import { Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  Zap,
  Languages,
  Palette,
  ShieldCheck,
  Settings2,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  Mail,
  ExternalLink,
} from "lucide-react";
import PricingSection from "@/components/PricingSection";
import LeadCapture from "@/components/LeadCapture";
import HowItWorks from "@/components/HowItWorks";
import DemoPreview from "@/components/DemoPreview";
import FAQ from "@/components/FAQ";
import { PLANS_ORDERED, getPlanById } from "@/lib/plans";
import { useLanguage } from "@/contexts/LanguageContext";

const StructuredData = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CaptionBoost",
    operatingSystem: "Chrome, Firefox, Edge",
    applicationCategory: "BrowserExtension",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Free tier available",
    },
    description: "AI-powered YouTube subtitle translation and generation tool",
    featureList: [
      "Real-time subtitle translation",
      "AI-powered text generation",
      "Customizable subtitle appearance",
      "Multi-language support",
    ],
    screenshot: "https://captionboost.it/og-image.png",
    softwareVersion: "1.0.0",
    author: {
      "@type": "Organization",
      name: "CaptionBoost",
      url: "https://captionboost.it",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1247",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
};

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
};

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const features = [
  { icon: Sparkles, key: "smartSubtitles" },
  { icon: Zap, key: "oneMinuteSetup" },
  { icon: Languages, key: "globalLanguages" },
  { icon: Palette, key: "customizableLook" },
  { icon: ShieldCheck, key: "privacyFirst" },
  { icon: Settings2, key: "reliableAutomation" },
];

export default function Home() {
  const { data: session } = useSession();
  const { language, t } = useLanguage();
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
    <>
      <StructuredData />
      <div className="min-h-screen bg-white text-slate-900 overflow-hidden">
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
                    { href: "#features", label: t("features") },
                    { href: "/pricing", label: t("pricing") },
                    { href: "#how-it-works", label: "Come funziona" },
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
                  {session?.user ? (
                    <div className="relative" ref={userMenuRef}>
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
                      >
                        {session.user.image && (
                          <Image
                            src={session.user.image}
                            alt={session.user.name || "User"}
                            width={28}
                            height={28}
                            className="rounded-full ring-2 ring-slate-100"
                          />
                        )}
                        <span className="hidden sm:inline">{session.user.name?.split(" ")[0] || "Account"}</span>
                      </button>
                      {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl py-2 z-50 ring-1 ring-slate-900/5">
                          <div className="px-4 py-3 border-b border-slate-50 mb-1">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account</p>
                            <p className="text-sm font-bold text-slate-900 truncate">{session.user.email}</p>
                          </div>
                          <Link href="/settings" className="block px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50">
                            {t("settings")}
                          </Link>
                          <Link href="/account" className="block px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50">
                            I miei sottotitoli
                          </Link>
                          <div className="mt-1 pt-1 border-t border-slate-50">
                            <button
                              onClick={() => { setShowUserMenu(false); signOut(); }}
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
                  { href: "#features", label: t("features") },
                  { href: "/pricing", label: t("pricing") },
                  { href: "#how-it-works", label: "Come funziona" },
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
                {session?.user ? (
                  <>
                    <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl">
                      I miei sottotitoli
                    </Link>
                    <button onClick={() => { setMobileMenuOpen(false); signOut(); }} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl">
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

        <main>
          <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
              <div className="max-w-5xl mx-auto text-center">
                <motion.div
                  initial="initial"
                  animate="animate"
                  variants={staggerContainer}
                >
                  <motion.div variants={fadeInUp}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 border border-sky-200/50 rounded-full text-sm font-medium text-primary mb-6">
                      <Sparkles className="w-4 h-4" />
                      <span>AI-powered subtitle translation</span>
                    </div>
                  </motion.div>

                  <motion.h1
                    variants={fadeInUp}
                    className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight"
                  >
                    <span className="text-slate-900">
                        I sottotitoli automatici di <span className="text-[#FF0000]">YouTube</span> sono <span className="text-slate-900 underline underline-offset-4 decoration-2 decoration-blue-400/60">imprecisi</span>.
                    </span>
                    <br />
                    <span className="text-slate-900 underline underline-offset-4 decoration-2 decoration-blue-400/60">CaptionBoost</span>
                    <span className="text-slate-900"> li </span>
                    <span className="text-slate-900 underline underline-offset-4 decoration-2 decoration-blue-400/60">perfeziona</span>
                    <span className="text-slate-900">.</span>
                  </motion.h1>

                  <motion.p
                    variants={fadeInUp}
                    className="mt-6 text-xl sm:text-2xl text-slate-800 font-semibold"
                  >
                    <span className="text-slate-900">
                      Genera <span className="text-slate-900 underline underline-offset-4 decoration-2 decoration-blue-400/60">sottotitoli AI accurati</span> per qualsiasi video.
                    </span>
                  </motion.p>

                  <motion.p
                    variants={fadeInUp}
                    className="mt-6 text-lg sm:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto"
                  >
                    {t("heroSubtitle")}
                  </motion.p>

                  <motion.div
                    variants={fadeInUp}
                    className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
                  >
                    <Link
                      href="/signup"
                      className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary border-2 border-primary hover:bg-slate-50 font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 text-sm sm:text-base"
                    >
                      {t("getStarted")}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <a
                      href="https://chromewebstore.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 font-semibold shadow-sm text-sm sm:text-base transition-all"
                    >
                      <svg viewBox="0 0 48 48" className="w-5 h-5 flex-shrink-0">
                        <circle cx="24" cy="24" r="22" fill="#fff" />
                        <path d="M24 2C13.3 2 4.2 9.9 2.2 20h15.3a12 12 0 0 1 19-9.9L41.5 4.6A22 22 0 0 0 24 2z" fill="#4285F4" />
                        <path d="M2.2 28A22 22 0 0 0 24 46c5.6 0 10.7-2.1 14.6-5.5L29.2 32.9a12 12 0 0 1-13.6-4.9H2.2z" fill="#EA4335" />
                        <path d="M46 24c0-3.8-1-7.4-2.7-10.5L30.5 20a12 12 0 0 1-6.5 16l5.3 9.3A22 22 0 0 0 46 24z" fill="#FBBC05" />
                        <circle cx="24" cy="24" r="8" fill="#34A853" />
                        <circle cx="24" cy="24" r="7" fill="#fff" />
                      </svg>
                      <span>Aggiungi a Chrome</span>
                    </a>
                  </motion.div>

                </motion.div>
              </div>
            </div>
          </section>

          <DemoPreview />



          <HowItWorks />

          <LeadCapture />

          <section
            id="features"
            className="py-14 sm:py-16 bg-white"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-10"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-200/50 rounded-full text-xs font-medium text-primary mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Funzionalità</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {t("whyChoose")}
                </h2>
                <p className="text-slate-500 mt-2 text-sm max-w-2xl mx-auto">
                  {t("whyChooseDesc")}
                </p>
              </motion.div>
              <motion.div
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {features.map((feature: { icon: React.ComponentType<{ className?: string }>; key: string }) => (
                  <motion.div
                    key={feature.key}
                    variants={fadeIn}
                    className="group relative bg-white rounded-2xl border border-slate-200/60 p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="absolute -inset-0.5 bg-primary/5 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-5 group-hover:bg-primary transition-all duration-300 group-hover:scale-110">
                        <feature.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
                        {t(feature.key)}
                      </h3>
                      <p className="mt-2 text-slate-500 text-sm leading-relaxed">
                        {t(feature.key + "Desc")}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          <div id="pricing" className="bg-white">
            <PricingSection />
          </div>

          <FAQ />

          <section className="py-14 sm:py-16 bg-white">
            <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 text-center shadow-sm">
                <div className="relative">
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                    {t("readyToStart")}
                  </h2>
                  <p className="mt-2 text-slate-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                    {t("readyToStartDesc")}
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      href="/pricing"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold transition-all shadow-lg shadow-primary/25 text-sm"
                    >
                      {t("viewPlans")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-16">
              <div className="col-span-2 md:col-span-1">
                <Link href="/" className="flex items-center gap-3 mb-4">
                  <Image
                    src="/captionboost.png"
                    alt="CaptionBoost"
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                  <span className="text-lg font-bold text-slate-900">CaptionBoost</span>
                </Link>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  AI-powered subtitle translation for YouTube. Break language barriers and reach a global audience.
                </p>
                <div className="flex items-center gap-3">
                  <a href="mailto:support@captionboost.it" className="w-9 h-9 rounded-full bg-slate-100 hover:bg-primary hover:text-white flex items-center justify-center transition-colors text-slate-500" aria-label="Email">
                    <Mail className="w-4 h-4" />
                  </a>
                  <a href="https://github.com/captionboost" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-slate-100 hover:bg-primary hover:text-white flex items-center justify-center transition-colors text-slate-500" aria-label="GitHub">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div>
                <h4 className="text-slate-900 font-semibold mb-4 text-sm uppercase tracking-wider">{t("product")}</h4>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/pricing" className="text-slate-500 hover:text-primary transition-colors">{t("pricing")}</Link></li>
                  <li><a href="#features" className="text-slate-500 hover:text-primary transition-colors">{t("features")}</a></li>
                  <li><a href="#how-it-works" className="text-slate-500 hover:text-primary transition-colors">Come funziona</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-slate-900 font-semibold mb-4 text-sm uppercase tracking-wider">{t("support")}</h4>
                <ul className="space-y-3 text-sm">
                  <li><a href="mailto:support@captionboost.it" className="text-slate-500 hover:text-primary transition-colors">support@captionboost.it</a></li>
                </ul>
              </div>

              <div>
                <h4 className="text-slate-900 font-semibold mb-4 text-sm uppercase tracking-wider">Legal</h4>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/privacy" className="text-slate-500 hover:text-primary transition-colors">{t("privacy")}</Link></li>
                  <li><Link href="/terms" className="text-slate-500 hover:text-primary transition-colors">{t("terms")}</Link></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-slate-200 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
              <p>&copy; {new Date().getFullYear()} CaptionBoost. {t("allRights")}</p>
              <div className="flex items-center gap-4">
                <Link href="/privacy" className="hover:text-primary transition-colors">{t("privacy")}</Link>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <Link href="/terms" className="hover:text-primary transition-colors">{t("terms")}</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

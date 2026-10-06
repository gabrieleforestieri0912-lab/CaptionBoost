"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
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
              {t("footerTagline")}
            </p>
            <div className="flex items-center gap-3">
              <a href="mailto:gabriele.forestieri0912@gmail.com" className="w-9 h-9 rounded-full bg-slate-100 hover:bg-primary hover:text-white flex items-center justify-center transition-colors text-slate-500" aria-label="Email">
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
              <li><a href="/#features" className="text-slate-500 hover:text-primary transition-colors">{t("features")}</a></li>
              <li><a href="/#how-it-works" className="text-slate-500 hover:text-primary transition-colors">{t("howItWorks")}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-900 font-semibold mb-4 text-sm uppercase tracking-wider">{t("support")}</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="mailto:gabriele.forestieri0912@gmail.com" className="text-slate-500 hover:text-primary transition-colors">gabriele.forestieri0912@gmail.com</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-900 font-semibold mb-4 text-sm uppercase tracking-wider">{t("legalTitle")}</h4>
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
  );
}

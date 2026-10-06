"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PricingSection from "@/components/PricingSection";
import { useLanguage } from "@/contexts/LanguageContext";

function PricingContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout") || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <header className="border-b border-primary-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-linear-to-r from-primary to-primary-100 bg-clip-text text-transparent">
            {t("pricingHeaderTitle")}
          </h1>
          <Link
            href="/"
            className="px-4 py-2 text-primary hover:bg-primary-50 rounded-lg font-medium transition-colors"
          >
            {t("backHome")}
          </Link>
        </div>
      </header>

      <PricingSection checkoutStatus={checkoutStatus} />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}

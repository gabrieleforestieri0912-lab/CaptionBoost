import Link from "next/link";
import PricingSection from "@/components/PricingSection";

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const resolved = await searchParams;
  const checkoutStatus = resolved?.checkout || "";

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50">
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            CaptionBoost - Piani
          </h1>
          <Link
            href="/"
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
          >
            Torna alla home
          </Link>
        </div>
      </header>

      <PricingSection checkoutStatus={checkoutStatus} />
    </div>
  );
}

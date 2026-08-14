import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Terms of Service</h1>

        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed">
          <p><strong>Last updated:</strong> March 2025</p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">1. Acceptance of Terms</h2>
          <p>
            By accessing or using CaptionBoost, you agree to be bound by these Terms of Service. If you do not agree, do not use the service. We reserve the right to update these terms at any time, with changes effective upon posting.
          </p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">2. Service Description</h2>
          <p>
            CaptionBoost provides AI-powered subtitle translation and generation for YouTube videos through a browser extension. Features vary by subscription plan.
          </p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">3. User Obligations</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. You agree not to misuse the service, including attempting to circumvent usage limits, reverse-engineering the extension, or using the service for any unlawful purpose.
          </p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">4. Subscription and Payments</h2>
          <p>
            Paid plans are billed monthly or annually as selected. Payments are processed securely by Stripe. Refunds are handled on a case-by-case basis. Cancellation takes effect at the end of the current billing period. We reserve the right to modify pricing with notice.
          </p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">5. Limitation of Liability</h2>
          <p>
            CaptionBoost is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from the use or inability to use the service, including but not limited to translation inaccuracies or service interruptions.
          </p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">6. Termination</h2>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms or engage in abusive behavior. You may terminate your account at any time through account settings. Upon termination, your data will be deleted within 30 days.
          </p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">7. Contact</h2>
          <p>
            For questions about these terms, contact us at <a href="mailto:support@captionboost.it" className="text-primary hover:underline">support@captionboost.it</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

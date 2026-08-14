import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Privacy Policy</h1>

        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed">
          <p><strong>Last updated:</strong> March 2025</p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">1. Information We Collect</h2>
          <p>
            We collect information you provide when creating an account, including your email address and display name. When using our extension, we process YouTube video caption data locally on your device. Cloud processing occurs only when you explicitly choose to save or translate subtitles through our servers.
          </p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">2. How We Use Your Information</h2>
          <p>
            Your information is used to provide and improve our subtitle translation service, authenticate your account, process payments, and communicate with you about service updates. We do not sell your personal data to third parties.
          </p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">3. Data Storage and Security</h2>
          <p>
            Account data is stored securely on our servers using industry-standard encryption. Saved subtitles are stored in your account and can be deleted at any time. We implement appropriate technical measures to protect your data against unauthorized access.
          </p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">4. Third-Party Services</h2>
          <p>
            We use Stripe for payment processing, Supabase for database hosting, and OpenAI for cloud AI fallback. Each service has its own privacy policy governing data handling. We do not share your personal data beyond what is necessary for these services to operate.
          </p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">5. Your Rights</h2>
          <p>
            You have the right to access, correct, or delete your personal data at any time through your account settings. You can export your saved subtitles and request complete deletion of your account and associated data by contacting us.
          </p>

          <h2 className="text-xl font-semibold text-slate-900 mt-8">6. Contact</h2>
          <p>
            For privacy-related inquiries, contact us at <a href="mailto:support@captionboost.it" className="text-primary hover:underline">support@captionboost.it</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function WelcomePage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-linear-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {t("welcomeTitle")}
        </h1>
        <p className="text-gray-600 mb-6">
          {t("freeSignupActive")}
        </p>
        <div className="bg-white rounded-2xl shadow-lg border border-primary-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">{t("whatFreePlan")}</h2>
          <ul className="text-left space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>{t("freeFeat1")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>{t("freeFeat2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>{t("freeFeat3")}</span>
            </li>
          </ul>
        </div>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
        >
          {t("startNow")}
        </Link>
      </div>
    </div>
  );
}

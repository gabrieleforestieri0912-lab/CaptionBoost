'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Benvenuto in CaptionBoost!
        </h1>
        <p className="text-gray-600 mb-6">
          La tua iscrizione gratuita è attiva. Inizia a tradurre i video YouTube con sottotitoli AI.
        </p>
        <div className="bg-white rounded-2xl shadow-lg border border-blue-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Cosa puoi fare con il piano Free:</h2>
          <ul className="text-left space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>50 traduzioni al mese</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>5 lingue supportate</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>Personalizzazione base</span>
            </li>
          </ul>
        </div>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Inizia ora
        </Link>
      </div>
    </div>
  );
}

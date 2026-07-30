# CaptionBoost — Sottotitoli AI per YouTube

Landing page moderna ed estensione Chrome che genera sottotitoli intelligenti su YouTube con AI (Llama3 + fallback OpenAI).

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Linguaggio**: TypeScript
- **UI**: React 19 + Tailwind CSS 4 + Framer Motion
- **Auth**: NextAuth v4 (Credentiali + Google OAuth)
- **Database**: Supabase (PostgreSQL)
- **AI**: Llama3 via Ollama + OpenAI SDK
- **Pagamenti**: Stripe
- **Estensione**: Chrome Manifest V3

## Prerequisiti

- Node.js 18+
- Ollama (per AI locale)

## Quick Start

```bash
npm install
npm run dev          # http://localhost:3000
```

Carica estensione:
```
chrome://extensions/
→ Modalità sviluppatore
→ Carica estensione non pacchettizzata
→ Seleziona: public/extension/
```

## Variabili d'ambiente

Copia `.env.example` in `.env.local` e configura:

| Variabile | Descrizione |
|-----------|-------------|
| `NEXTAUTH_SECRET` | Chiave per JWT |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Database Supabase |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Pagamenti |
| `SMTP_*` | Email (reset password, codici) |
| `OPENAI_API_KEY` | Fallback cloud AI |

## Struttura

```
src/
├── app/                   # Pages + API routes
│   ├── page.tsx           # Landing page
│   ├── api/               # API routes (auth, stripe, account, ai, feedback)
│   ├── login/             # Login
│   ├── signup/            # Registrazione
│   ├── settings/          # Impostazioni profilo
│   ├── account/           # Sottotitoli salvati
│   ├── pricing/           # Piani abbonamento
│   └── (forgot|reset)-password/
├── components/            # Componenti React
├── contexts/              # LanguageContext (i18n EN/IT)
└── lib/                   # Librerie (db, auth, email, supabase, types)
    ├── supabase.ts        # Client Supabase
    ├── db.ts              # CRUD con Supabase
    ├── auth-options.ts    # Config NextAuth
    ├── email.ts           # Invio email
    ├── plans.ts           # Piani prezzo
    └── types.ts           # Tipi condivisi
```

## Comandi

```bash
npm run dev              # Dev server
npm run build            # Build produzione
npm run start            # Avvia produzione
npm run lint             # ESLint
npm run extension:build  # Build estensione
```

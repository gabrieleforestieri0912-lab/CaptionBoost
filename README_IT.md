# CaptionBoost — Sottotitoli AI per YouTube

Landing page moderna ed estensione Chrome che genera sottotitoli intelligenti su YouTube con AI (Ollama deepseek-r1 di default; con API Key usa il modello più adatto per il provider scelto).

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Linguaggio**: TypeScript
- **UI**: React 19 + Tailwind CSS 4 + Framer Motion
- **Auth**: Supabase Auth (Credenziali + Google OAuth)
- **Database**: Supabase (PostgreSQL)
- **AI**: Ollama deepseek-r1 (locale) + API Key cloud (OpenAI, Gemini, Groq, Anthropic, DeepL)
- **Pagamenti**: Stripe
- **Estensione**: Chrome Manifest V3

## Prerequisiti

- Node.js 18+
- Ollama (per AI locale — `ollama pull deepseek-r1`)

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
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase (database + auth). Il login Google passa da Supabase Auth: attiva il provider Google nel dashboard e registra `https://<ref>.supabase.co/auth/v1/callback` come redirect URI |
| `NEXTAUTH_SECRET` | Chiave JWT per le route custom dell'estensione (`/api/auth/*`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google (flusso custom estensione) |
| `DEFAULT_AI_PROVIDER` / `DEFAULT_AI_MODEL` | Motore AI predefinito (default `ollama` / `deepseek-r1`, nessuna API key richiesta) |
| `OLLAMA_API_URL` | URL del server Ollama locale (default `http://localhost:11434`) |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` / `GROQ_API_KEY` / `ANTHROPIC_API_KEY` / `DEEPL_API_KEY` | Percorso parallelo con API key: il sistema sceglie il modello più adatto per provider |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Pagamenti |
| `SMTP_*` | Email (reset password, codici) |
| `NEXT_PUBLIC_EXTENSION_API` | Base URL usata dall'estensione (default `http://localhost:3000`) |

## Struttura

```
src/
├── app/                   # Pages + API routes
│   ├── page.tsx           # Landing page (con demo sottotitoli statici)
│   ├── api/               # API routes (auth, stripe, account, ai, captions, feedback)
│   ├── auth/              # Route /auth/callback (scambio codice OAuth Supabase)
│   ├── login/             # Login
│   ├── signup/            # Registrazione
│   ├── settings/          # Impostazioni profilo
│   ├── account/           # Sottotitoli salvati
│   ├── pricing/           # Piani abbonamento
│   └── (forgot|reset)-password/
├── components/            # Componenti React
├── contexts/              # LanguageContext (i18n EN/IT)
└── lib/                   # Librerie (db, auth, email, supabase, ai, types)
    ├── supabase.ts        # Client Supabase (DB)
    ├── supabase-browser.ts# Client Supabase Auth (browser)
    ├── supabase-server.ts # Client Supabase Auth (server, su cookie)
    ├── auth.ts            # ensureUserProfile: sincronizza utenti Supabase Auth in tabella users
    ├── get-user.ts        # Ottiene l'utente autenticato (sessione + Bearer per estensione)
    ├── ai-provider.ts     # Motore AI: Ollama deepseek-r1 o API key con modello per provider
    ├── ai-translation.ts  # Traduzione contestuale a finestre dei sottotitoli
    ├── demo-subtitles.ts  # Dati demo statici (trascrizioni reali + traduzione IT)
    ├── db.ts              # CRUD con Supabase
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
npm run ollama:pull      # Scarica deepseek-r1 per Ollama
```

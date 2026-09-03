# CaptionBoost — Sottotitoli AI per YouTube

Landing page moderna ed estensione Chrome che genera sottotitoli intelligenti su YouTube con AI (Google Gemini di default; con API Key usa il modello più adatto per il provider scelto).

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Linguaggio**: TypeScript
- **UI**: React 19 + Tailwind CSS 4 + Framer Motion
- **Auth**: Supabase Auth (Credenziali + Google OAuth)
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini (gemini-2.0-flash di default) + API Key cloud (OpenAI, Gemini, Groq, Anthropic, DeepL)
- **Pagamenti**: Stripe
- **Estensione**: Chrome Manifest V3

## Prerequisiti

- Node.js 18+
- Chiave API Gemini (`GEMINI_API_KEY` — ottienila da https://aistudio.google.com/apikey)

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

Copia `.env` (unico file di configurazione) e completa le variabili.

| Variabile | Descrizione |
|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase (database + auth). Il login Google passa da Supabase Auth: attiva il provider Google nel dashboard e registra `https://<ref>.supabase.co/auth/v1/callback` come redirect URI |
| `NEXTAUTH_SECRET` | Chiave JWT per le route custom dell'estensione (`/api/auth/*`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google (flusso custom estensione) |
| `DEFAULT_AI_PROVIDER` / `DEFAULT_AI_MODEL` | Motore AI predefinito (default `gemini` / `gemini-2.0-flash`) |
| `GEMINI_API_KEY` | Chiave API Google Gemini (richiesta come motore predefinito) |
| `OPENAI_API_KEY` / `GROQ_API_KEY` / `ANTHROPIC_API_KEY` / `DEEPL_API_KEY` | Percorso parallelo con API key: il sistema sceglie il modello più adatto per provider |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Pagamenti |
| `RESEND_API_KEY` | Email transazionali (login code, reset password, notifiche feedback) |
| `RESEND_EMAIL_FROM` | Mittente (dominio verificato su Resend) |
| `RESEND_ADMIN_EMAIL` | Destinatario notifiche feedback ed email inbound |
| `RESEND_WEBHOOK_SECRET` | Segreto firma del webhook inbound (`/api/email/inbound`) |
| `NEXT_PUBLIC_EXTENSION_API` | Base URL usata dall'estensione (default `http://localhost:3000`) |

### Email in arrivo (Resend Inbound)

1. In Resend verifica un dominio (es. `captionboost.it`) e abilita **Inbound**.
2. Crea una route inbound che faccia POST a `https://<app>/api/email/inbound`
   (in locale `http://localhost:3000/api/email/inbound`).
3. Copia il **Webhook signing secret** in `RESEND_WEBHOOK_SECRET`.
4. Crea la tabella nel database Supabase:

```sql
create table if not exists public.inbound_emails (
  id uuid primary key default gen_random_uuid(),
  "from" text,
  "to" text,
  subject text,
  text_body text,
  html_body text,
  message_id text,
  created_at timestamptz default now()
);
```

Le email ricevute vengono salvate in `inbound_emails` e l'admin riceve una notifica
(rispondendo alla notifica si risponde al mittente originale via Reply-To).

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
    ├── ai-provider.ts     # Motore AI: Google Gemini o altre API key con modello per provider
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
```

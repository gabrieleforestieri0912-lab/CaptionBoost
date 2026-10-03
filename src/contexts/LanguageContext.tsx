'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'

interface LanguageContextType {
  language: string
  changeLanguage: (lang: string) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

/**
 * Rileva la lingua in base al paese di accesso:
 * - Italia (lingua browser `it*` oppure timezone Europe/Rome) -> 'it'
 * - Tutti gli altri paesi -> 'en' (default)
 * La scelta manuale in localStorage ha sempre precedenza.
 */
function detectCountryLanguage(): 'it' | 'en' {
  try {
    const navLang = (navigator.language || '').toLowerCase()
    if (navLang.startsWith('it')) return 'it'
    // Fallback: timezone italiana ma browser in inglese
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      if (tz === 'Europe/Rome' || tz === 'Europe/Vatican' || tz === 'Europe/San_Marino') return 'it'
    } catch {}
  } catch {}
  return 'en'
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('language')
      if (stored === 'it' || stored === 'en') return stored
      return detectCountryLanguage()
    }
    // SSR default: inglese per tutti gli altri paesi
    return 'en'
  })

  // Sincronizza <html lang> per SEO/accessibilità
  useEffect(() => {
    try {
      document.documentElement.lang = language
    } catch {}
  }, [language])

  const changeLanguage = (lang: string) => {
    // Solo 'it' | 'en': qualunque altro valore ripiega su inglese
    const normalized = lang === 'it' ? 'it' : 'en'
    setLanguage(normalized)
    try {
      localStorage.setItem('language', normalized)
    } catch {}
  }

  const translations: Record<string, Record<string, string>> = {
    en: {
      // Navigation
      features: 'Features',
      featuresBadge: 'Features',
      pricing: 'Pricing',
      docs: 'Docs',
      support: 'Support',
      login: 'Log in',
      signup: 'Sign Up',
      settings: 'Settings',
      account: 'Account',
      logout: 'Logout',
      howItWorks: 'How it works',
      howItWorksBadge: 'How it works',
      mySubtitles: 'My Subtitles',

      // Hero section
      heroBadge: 'AI-powered subtitle translation',
      heroTitle:
        'YouTube subtitles inaccurate and unprofessional? Perfect AI translations with CaptionBoost, in real time.',
      heroH1a: 'YouTube auto-subtitles are',
      heroH1b: 'inaccurate',
      heroH1c: 'CaptionBoost',
      heroH1d: 'perfects them',
      heroSub2: 'Generate accurate AI subtitles for any video.',
      heroSubtitle:
        'Translate and generate professional-quality subtitles with low latency and direct player integration. Expand the reach of your videos and improve accessibility.',
      getStarted: 'Get started — Free',
      watchDemo: 'Watch demo',
      addToChrome: 'Add to Chrome',
      checkoutSuccess: 'Subscription activated successfully. Welcome to Pro!',

      // Features
      smartSubtitles: 'Smart Subtitles',
      smartSubtitlesDesc:
        'Natural, contextual translation powered by advanced AI in real time.',
      oneMinuteSetup: 'One-minute setup',
      oneMinuteSetupDesc:
        'Install the extension and enable it on YouTube videos immediately.',
      globalLanguages: 'Global Languages',
      globalLanguagesDesc:
        'Multi-language support for creators, students and international teams.',
      customizableLook: 'Customizable Look',
      customizableLookDesc:
        'Full control over subtitle style, position and readability.',
      privacyFirst: 'Privacy-first',
      privacyFirstDesc:
        'Designed workflows to minimize tracking and user friction.',
      reliableAutomation: 'Reliable Automation',
      reliableAutomationDesc:
        'Robust pipeline for consistent syncing and rendering.',
      whyChoose: 'Why choose CaptionBoost',
      whyChooseDesc:
        'A complete set of tools for large-scale video localization.',

      // How it works
      howItWorksTitle: 'Get started in 3 simple steps',
      howItWorksDesc:
        'CaptionBoost integrates with YouTube, processes audio with AI and generates accurate subtitles in real time.',
      step1Title: 'Install',
      step1Desc: 'Add CaptionBoost from the Chrome Web Store in one click.',
      step2Title: 'Play & translate',
      step2Desc: 'Open any YouTube video: AI translates subtitles in real time.',
      step3Title: 'Choose & manage',
      step3Desc: 'Select the target language, save subtitles and manage them from your account.',

      // Lead capture
      leadBadge: 'Free trial',
      leadTitle: 'Try CaptionBoost — 14 days free',
      leadDesc: 'No credit card required. Start now with a free account and discover the power of AI applied to subtitles.',
      leadCta: 'Create free account',
      viewPlans: 'View plans',

      // Demo section
      realtimeProcessing: 'Realtime processing',
      realtimeProcessingDesc:
        'Low latency on live streams and recorded content.',
      subtitleControls: 'Subtitle controls',
      subtitleControlsDesc:
        'Preset styling and advanced options inside the extension.',

      // CTA section
      readyToStart: 'Ready to get started?',
      readyToStartDesc:
        'Install the extension, choose your plan, and translate your content in minutes. Join thousands of creators.',
      downloadExtension: 'Download extension',

      // Demo preview
      demoBadge: 'Interactive demo',
      demoLivePreview: 'Live Preview',
      demoTitle: 'See it in action',
      demoDesc:
        'Choose a language and press play: real video subtitles are translated by AI, synced to the voice.',
      demoCurrently: 'Currently translating to',
      demoTarget: 'English',
      demoNote: 'Demo with real video transcripts and AI translation · Quality in the live version is identical.',

      // Pricing
      pricingBadge: 'Plans',
      pricingTitle: 'Subscription plans',
      pricingDesc: 'Choose the plan that fits your translation volume. Change plan at any time.',
      monthly: 'Monthly',
      annual: 'Annual',
      per: 'per',
      saveAnnual: 'Save',
      perYear: '/year',
      freeForever: 'Free forever',
      billedAnnually: 'Billed annually',
      checkoutCancel: 'Checkout cancelled. You can retry anytime.',
      guarantee: '14-Day Guarantee',
      guaranteeDesc: 'Try risk-free. Cancel anytime.',
      teamDiscount: 'Team Discount',
      teamDiscountDesc: 'Contact us for custom plans and high volumes.',

      // FAQ
      faqTitle: 'Frequently asked questions',
      faqDesc: 'Answers to the most common questions about plans, privacy and usage.',
      faq1q: 'How much does CaptionBoost cost?',
      faq1a: 'We offer a free plan and paid plans with monthly or annual billing. See the Pricing section for details.',
      faq2q: 'Can I use CaptionBoost offline?',
      faq2a: 'CaptionBoost is a cloud service and requires an internet connection to work.',
      faq3q: 'Which export formats are supported?',
      faq3a: 'SRT, VTT, ASS, SBV and JSON for custom integrations.',
      faq4q: 'How do I protect my privacy?',
      faq4a: 'Local processing is available; in the cloud we minimize logs and follow security best practices.',
      faq5q: 'Are subtitles saved automatically?',
      faq5a: "Yes! Every time you enable subtitles on a YouTube video, they are automatically saved to your account under 'My Subtitles'.",

      // Testimonials
      testimonialsBadge: 'Testimonials',
      testimonialsTitle: 'What users say',
      testimonialsDesc: 'Real feedback from creators, agencies and educators.',
      testimonial1: "I grew my reach by 30% — perfect subtitles in a few clicks. The AI is incredibly accurate.",
      testimonial2: 'Stable workflow and easy integration with our CMS. It saved us hundreds of hours of manual work.',
      testimonial3: 'Students understand better now: improved accessibility. An essential tool for every online course creator.',
      roleYoutuber: 'YouTuber',
      roleAgency: 'Agency',
      roleEducator: 'Educator',

      // Screenshots
      screenshotsTitle: 'See the app in action',
      screenshotsDesc: 'Real screenshots of the workflow: capture, translate and export. Designed for speed and ease of use.',

      // QA overlay
      qaGreeting: 'Hi! Ask me anything about the content of this video',
      qaPlaceholder: 'Ask a question about the video...',
      qaError: 'Sorry, I could not process the question.',
      qaNetworkError: 'An error occurred. Please try again later.',

      // Account / Subtitles
      mySubtitlesDesc:
        'All your saved subtitles from YouTube videos',
      noSubtitles: 'No subtitles saved yet',
      noSubtitlesDesc:
        'Install the extension and enable subtitles on a YouTube video to see them here.',
      installExtension: 'Install extension',
      searchSubtitles: 'Search by title or language...',
      exportSrt: 'Export SRT',
      deleteSubtitle: 'Delete',
      confirmDelete: 'Delete this subtitle?',

      // Settings / Account
      languageTitle: 'Language',
      languageDesc2: 'Choose the interface language',
      saveProfile: 'Save profile',
      saving: 'Saving...',
      backHome: 'Back to home',
      loadingSubtitles: 'Loading subtitles...',
      videosSaved: 'saved videos',
      linesTotal: 'total lines',
      noResults: 'No results',
      signInGoogle: 'Sign in with Google',
      signUpGoogle: 'Sign up with Google',
      confirmNewPassword: 'Confirm new password',
      resetting: 'Resetting...',
      resetPassword: 'Reset password',
      profile: 'Profile',
      name: 'Name',
      email: 'Email',
      profileUpdated: 'Profile updated successfully.',
      passwordsNoMatch: 'Passwords do not match.',
      loadingSettings: 'Loading settings...',
      sending: 'Sending...',
      sendFeedback: 'Send feedback',
      featureRequest: 'Feature request',

      // Footer
      footerTagline: 'AI-powered subtitle translation for YouTube. Break language barriers and reach a global audience.',
      product: 'Product',
      contact: 'Contact',
      privacy: 'Privacy',
      terms: 'Terms',
      allRights: 'All rights reserved.',
    },
    it: {
      // Navigation
      features: 'Funzionalità',
      featuresBadge: 'Funzionalità',
      pricing: 'Prezzi',
      docs: 'Documentazione',
      support: 'Supporto',
      login: 'Accedi',
      signup: 'Registrati',
      settings: 'Impostazioni',
      account: 'Account',
      logout: 'Esci',
      howItWorks: 'Come funziona',
      howItWorksBadge: 'Come funziona',
      mySubtitles: 'I miei sottotitoli',

      // Hero section
      heroBadge: 'Traduzione sottotitoli con AI',
      heroTitle:
        'Sottotitoli YouTube imprecisi e poco professionali? Traduzioni AI perfette con CaptionBoost, in tempo reale.',
      heroH1a: 'I sottotitoli automatici di YouTube sono',
      heroH1b: 'imprecisi',
      heroH1c: 'CaptionBoost',
      heroH1d: 'li perfeziona',
      heroSub2: 'Genera sottotitoli AI accurati per qualsiasi video.',
      heroSubtitle:
        "Traduci e genera sottotitoli di qualità professionale con bassa latenza e integrazione diretta nel player. Espandi la portata dei tuoi video e migliora l'accessibilità.",
      getStarted: 'Inizia — Gratis',
      watchDemo: 'Guarda demo',
      addToChrome: 'Aggiungi a Chrome',
      checkoutSuccess: 'Abbonamento attivato con successo. Benvenuto in Pro!',

      // Features
      smartSubtitles: 'Sottotitoli Intelligenti',
      smartSubtitlesDesc:
        'Traduzione naturale e contestuale potenziata da AI avanzata in tempo reale.',
      oneMinuteSetup: 'Configurazione in un minuto',
      oneMinuteSetupDesc:
        "Installa l'estensione e attivala sui video YouTube immediatamente.",
      globalLanguages: 'Lingue Globali',
      globalLanguagesDesc:
        'Supporto multilingua per creator, studenti e team internazionali.',
      customizableLook: 'Aspetto Personalizzabile',
      customizableLookDesc:
        'Controllo completo su stile, posizione e leggibilità dei sottotitoli.',
      privacyFirst: 'Privacy First',
      privacyFirstDesc:
        "Flussi di lavoro progettati per minimizzare il tracciamento e l'attrito degli utenti.",
      reliableAutomation: 'Automazione Affidabile',
      reliableAutomationDesc:
        'Pipeline robusta per sincronizzazione e rendering consistenti.',
      whyChoose: 'Perché scegliere CaptionBoost',
      whyChooseDesc:
        'Un set completo di strumenti per la localizzazione video su larga scala.',

      // How it works
      howItWorksTitle: 'Inizia in 3 semplici passi',
      howItWorksDesc:
        "CaptionBoost si integra con YouTube, elabora l'audio con AI e genera sottotitoli accurati in tempo reale.",
      step1Title: 'Installa',
      step1Desc: 'Aggiungi CaptionBoost dal Chrome Web Store in un clic.',
      step2Title: 'Riproduci e traduci',
      step2Desc: "Apri qualsiasi video YouTube: l'AI traduce i sottotitoli in tempo reale.",
      step3Title: 'Scegli e gestisci',
      step3Desc: 'Seleziona la lingua target, salva i sottotitoli e gestiscili dal tuo account.',

      // Lead capture
      leadBadge: 'Prova gratuita',
      leadTitle: 'Prova CaptionBoost — 14 giorni gratis',
      leadDesc: "Nessuna carta di credito richiesta. Inizia ora con un account gratuito e scopri la potenza dell'AI applicata ai sottotitoli.",
      leadCta: 'Crea account gratuito',
      viewPlans: 'Vedi piani',

      // Demo section
      realtimeProcessing: 'Elaborazione in tempo reale',
      realtimeProcessingDesc:
        'Bassa latenza su live streaming e contenuti registrati.',
      subtitleControls: 'Controlli sottotitoli',
      subtitleControlsDesc:
        "Stile predefinito e opzioni avanzate all'interno dell'estensione.",

      // CTA section
      readyToStart: 'Pronto per iniziare?',
      readyToStartDesc:
        "Installa l'estensione, scegli il tuo piano e traduci i tuoi contenuti in pochi minuti. Unisciti a migliaia di creator.",
      downloadExtension: 'Scarica estensione',

      // Demo preview
      demoBadge: 'Demo interattiva',
      demoLivePreview: 'Anteprima Live',
      demoTitle: 'Guardalo in azione',
      demoDesc:
        'Scegli una lingua e premi play: i sottotitoli reali del video vengono tradotti in italiano dall\u2019AI, sincronizzati con la voce.',
      demoCurrently: 'Stai traducendo in',
      demoTarget: 'Italiano',
      demoNote: 'Demo con trascrizioni reali dei video e traduzione AI · La qualità nella versione reale è identica.',

      // Pricing
      pricingBadge: 'Piani',
      pricingTitle: 'Piani di abbonamento',
      pricingDesc: 'Scegli il piano adatto al tuo volume di traduzione. Cambia piano in qualsiasi momento.',
      monthly: 'Mensile',
      annual: 'Annuale',
      per: 'per',
      saveAnnual: 'Risparmi',
      perYear: "all'anno",
      freeForever: 'Gratuito per sempre',
      billedAnnually: 'Fatturato annualmente',
      checkoutCancel: 'Checkout annullato. Puoi riprovare quando vuoi.',
      guarantee: 'Garanzia 14 Giorni',
      guaranteeDesc: 'Prova senza rischi. Cancella in qualsiasi momento.',
      teamDiscount: 'Sconto Team',
      teamDiscountDesc: 'Contattaci per piani personalizzati e volumi elevati.',

      // FAQ
      faqTitle: 'Domande frequenti',
      faqDesc: 'Risposte alle domande più comuni su piani, privacy e utilizzo.',
      faq1q: 'Quanto costa CaptionBoost?',
      faq1a: 'Offriamo un piano gratuito e piani a pagamento con fatturazione mensile o annuale. Consulta la sezione Prezzi per i dettagli.',
      faq2q: 'Posso usare CaptionBoost offline?',
      faq2a: 'CaptionBoost è un servizio cloud e richiede una connessione internet per funzionare.',
      faq3q: 'Quali formati di esportazione sono supportati?',
      faq3a: 'SRT, VTT, ASS, SBV e JSON per integrazioni personalizzate.',
      faq4q: 'Come proteggere la mia privacy?',
      faq4a: "L'elaborazione locale è disponibile; nel cloud minimizziamo i log e seguiamo le migliori pratiche di sicurezza.",
      faq5q: 'I sottotitoli vengono salvati automaticamente?',
      faq5a: "Sì! Ogni volta che abiliti i sottotitoli su un video YouTube, vengono salvati automaticamente nel tuo account nella sezione 'I miei sottotitoli'.",

      // Testimonials
      testimonialsBadge: 'Testimonianze',
      testimonialsTitle: 'Cosa dicono gli utenti',
      testimonialsDesc: 'Feedback reali da creator, agenzie e educatori.',
      testimonial1: "Ho aumentato la portata del 30% — sottotitoli perfetti in pochi clic. L'AI è incredibilmente accurata.",
      testimonial2: 'Flusso di lavoro stabile e facile integrazione con il nostro CMS. Ci ha risparmiato centinaia di ore di lavoro manuale.',
      testimonial3: 'Gli studenti capiscono meglio ora: accessibilità migliorata. Uno strumento indispensabile per ogni creatore di corsi online.',
      roleYoutuber: 'YouTuber',
      roleAgency: 'Agenzia',
      roleEducator: 'Educatrice',

      // Screenshots
      screenshotsTitle: "Vedi l'app in azione",
      screenshotsDesc: "Screenshot reali del flusso di lavoro: cattura, traduci ed esporta. Progettato per velocità e facilità d'uso.",

      // QA overlay
      qaGreeting: 'Ciao! Chiedimi qualsiasi cosa sul contenuto di questo video',
      qaPlaceholder: 'Fai una domanda sul video...',
      qaError: 'Mi dispiace, non ho potuto elaborare la domanda.',
      qaNetworkError: 'Si è verificato un errore. Riprova più tardi.',

      // Account / Subtitles
      mySubtitlesDesc:
        'Tutti i tuoi sottotitoli salvati dai video YouTube',
      noSubtitles: 'Nessun sottotitolo salvato',
      noSubtitlesDesc:
        "Installa l'estensione e abilita i sottotitoli su un video YouTube per vederli apparire qui.",
      installExtension: 'Installa estensione',
      searchSubtitles: 'Cerca per titolo o lingua...',
      exportSrt: 'Esporta SRT',
      deleteSubtitle: 'Elimina',
      confirmDelete: 'Eliminare questo sottotitolo?',

      // Settings / Account
      languageTitle: 'Lingua',
      languageDesc2: "Scegli la lingua dell'interfaccia",
      saveProfile: 'Salva profilo',
      saving: 'Salvataggio...',
      backHome: 'Torna alla home',
      loadingSubtitles: 'Caricamento sottotitoli...',
      videosSaved: 'video salvati',
      linesTotal: 'righe totali',
      noResults: 'Nessun risultato',
      signInGoogle: 'Accedi con Google',
      signUpGoogle: 'Registrati con Google',
      confirmNewPassword: 'Conferma nuova password',
      resetting: 'Reimpostazione...',
      resetPassword: 'Reimposta password',
      profile: 'Profilo',
      name: 'Nome',
      email: 'Email',
      profileUpdated: 'Profilo aggiornato con successo.',
      passwordsNoMatch: 'Le password non corrispondono.',
      loadingSettings: 'Caricamento impostazioni...',
      sending: 'Invio in corso...',
      sendFeedback: 'Invia feedback',
      featureRequest: 'Richiesta funzionalità',

      // Footer
      footerTagline: 'Traduzione sottotitoli con AI per YouTube. Supera le barriere linguistiche e raggiungi un pubblico globale.',
      product: 'Prodotto',
      contact: 'Contatto',
      privacy: 'Privacy',
      terms: 'Termini',
      allRights: 'Tutti i diritti riservati.',
    },
  }

  const t = (key: string): string => {
    // Fallback: inglese, poi chiave stessa
    return translations[language]?.[key] ?? translations['en']?.[key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

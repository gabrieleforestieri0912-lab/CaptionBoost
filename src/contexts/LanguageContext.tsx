'use client'

import {
  createContext,
  useContext,
  useState,
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

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      // Solo 'it' | 'en', default italiano
      return localStorage.getItem('language') === 'en' ? 'en' : 'it'
    }
    return 'it'
  })

  const changeLanguage = (lang: string) => {
    // Solo 'it' | 'en': qualunque altro valore ripiega su italiano
    const normalized = lang === 'en' ? 'en' : 'it'
    setLanguage(normalized)
    localStorage.setItem('language', normalized)
  }

  const translations: Record<string, Record<string, string>> = {
    en: {
      // Navigation
      features: 'Features',
      pricing: 'Pricing',
      docs: 'Docs',
      support: 'Support',
      login: 'Log in',
      signup: 'Sign Up',
      settings: 'Settings',
      account: 'Account',
      logout: 'Logout',

      // Hero section
      heroTitle:
        'YouTube subtitles inaccurate and unprofessional? Perfect AI translations with CaptionBoost, in real time.',
      heroSubtitle:
        'Translate and generate professional-quality subtitles with low latency and direct player integration. Expand the reach of your videos and improve accessibility.',
      getStarted: 'Get started — Free',
      watchDemo: 'Watch demo',

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
      viewPlans: 'View plans',

      // Demo preview
      demoLivePreview: 'Live Preview',
      demoTitle: 'See it in action',
      demoDesc:
        'Watch how CaptionBoost transforms YouTube subtitles with AI-powered translations in real time.',
      demoCurrently: 'Currently translating to',

      // Account / Subtitles
      mySubtitles: 'My Subtitles',
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

      // Footer
      product: 'Product',
      contact: 'Contact',
      privacy: 'Privacy',
      terms: 'Terms',
      allRights: 'All rights reserved.',
    },
    it: {
      // Navigation
      features: 'Funzionalità',
      pricing: 'Prezzi',
      docs: 'Documentazione',
      support: 'Supporto',
      login: 'Accedi',
      signup: 'Registrati',
      settings: 'Impostazioni',
      account: 'Account',
      logout: 'Esci',

      // Hero section
      heroTitle:
        'Sottotitoli YouTube imprecisi e poco professionali? Traduzioni AI perfette con CaptionBoost, in tempo reale.',
      heroSubtitle:
        'Traduci e genera sottotitoli di qualità professionale con bassa latenza e integrazione diretta nel player. Espandi la portata dei tuoi video e migliora l\'accessibilità.',
      getStarted: 'Inizia — Gratis',
      watchDemo: 'Guarda demo',

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
        'Flussi di lavoro progettati per minimizzare il tracciamento e l\'attrito degli utenti.',
      reliableAutomation: 'Automazione Affidabile',
      reliableAutomationDesc:
        'Pipeline robusta per sincronizzazione e rendering consistenti.',
      whyChoose: 'Perché scegliere CaptionBoost',
      whyChooseDesc:
        'Un set completo di strumenti per la localizzazione video su larga scala.',

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
      downloadExtension: "Scarica estensione",
      viewPlans: 'Vedi piani',

      // Demo preview
      demoLivePreview: 'Anteprima Live',
      demoTitle: 'Guardalo in azione',
      demoDesc:
        'Guarda come CaptionBoost trasforma i sottotitoli YouTube con traduzioni AI in tempo reale.',
      demoCurrently: 'Stai traducendo in',

      // Account / Subtitles
      mySubtitles: 'I miei sottotitoli',
      mySubtitlesDesc:
        'Tutti i tuoi sottotitoli salvati dai video YouTube',
      noSubtitles: 'Nessun sottotitolo salvato',
      noSubtitlesDesc:
        "Installa l'estensione e abilita i sottotitoli su un video YouTube per vederli apparire qui.",
      installExtension: "Installa estensione",
      searchSubtitles: 'Cerca per titolo o lingua...',
      exportSrt: 'Esporta SRT',
      deleteSubtitle: 'Elimina',
      confirmDelete: 'Eliminare questo sottotitolo?',

      // Footer
      product: 'Prodotto',
      contact: 'Contatto',
      privacy: 'Privacy',
      terms: 'Termini',
      allRights: 'Tutti i diritti riservati.',
    },
  }

  const t = (key: string): string => {
    return translations[language]?.[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

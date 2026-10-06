'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Loader2, RotateCcw, Save, Subtitles } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  DEFAULT_SUBTITLE_SETTINGS,
  SUBTITLE_LANGUAGES,
  loadLocalSubtitleSettings,
  loadSubtitleSettingsFromExtension,
  saveLocalSubtitleSettings,
  syncSubtitleSettingsToExtension,
  type SubtitleSettings,
} from '@/lib/subtitle-settings'

const inputCls =
  'w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition'

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-[#4C94FF]"
      />
      {label}
    </label>
  )
}

export default function SubtitleCustomizer() {
  const { t } = useLanguage()
  const [settings, setSettings] = useState<SubtitleSettings>({
    ...DEFAULT_SUBTITLE_SETTINGS,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  // Carica dall'estensione (se installata), altrimenti da localStorage
  useEffect(() => {
    let cancelled = false
    async function init() {
      const fromExt = await loadSubtitleSettingsFromExtension()
      if (cancelled) return
      if (fromExt) {
        setSettings(fromExt)
        saveLocalSubtitleSettings(fromExt)
      } else {
        setSettings(loadLocalSubtitleSettings())
      }
      setLoading(false)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const set = <K extends keyof SubtitleSettings>(key: K, value: SubtitleSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  async function handleSave() {
    setSaving(true)
    setNotice('')
    saveLocalSubtitleSettings(settings)
    const synced = await syncSubtitleSettingsToExtension(settings)
    setNotice(synced ? `${t('subtitlesSaved')} ${t('extensionSynced')}` : `${t('subtitlesSaved')} ${t('extensionNotFound')}`)
    setSaving(false)
  }

  async function handleReset() {
    const defaults = { ...DEFAULT_SUBTITLE_SETTINGS }
    setSettings(defaults)
    saveLocalSubtitleSettings(defaults)
    const synced = await syncSubtitleSettingsToExtension(defaults)
    setNotice(synced ? `${t('subtitlesSaved')} ${t('extensionSynced')}` : `${t('subtitlesSaved')} ${t('extensionNotFound')}`)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    )
  }

  const originalStyle = {
    fontSize: `${16 * parseFloat(settings.originalSize || '1')}px`,
    fontWeight: parseInt(settings.originalWeight || '400', 10),
    color: settings.originalColor,
  }
  const translatedStyle = {
    fontSize: `${16 * parseFloat(settings.translatedSize || '1')}px`,
    fontWeight: parseInt(settings.translatedWeight || '500', 10),
    color: settings.translatedColor,
  }
  const boxStyle = {
    background: settings.captionBackground,
    borderRadius: settings.captionRadius,
    padding: settings.captionPadding,
    marginLeft: settings.captionHorizontalMargin,
    marginRight: settings.captionHorizontalMargin,
  }

  return (
    <div>
      {/* Lingua + visibilità */}
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <Field label={t('subtitleLanguageLabel')}>
          <select
            value={settings.outputLanguage}
            onChange={(e) => set('outputLanguage', e.target.value)}
            className={inputCls}
          >
            {SUBTITLE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-col justify-end gap-2.5 pb-1">
          <CheckRow
            checked={settings.showCaptions}
            onChange={(v) => set('showCaptions', v)}
            label={t('showCaptionsLabel')}
          />
          <CheckRow
            checked={settings.showOriginalCaptions}
            onChange={(v) => set('showOriginalCaptions', v)}
            label={t('showOriginalLabel')}
          />
          <CheckRow
            checked={settings.translationNotes}
            onChange={(v) => set('translationNotes', v)}
            label={t('translationNotesLabel')}
          />
        </div>
      </div>

      {/* Stili originali / tradotti */}
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl border border-slate-100 bg-stone-50 p-4">
          <p className="text-sm font-bold text-slate-900 mb-3">{t('originalCaptions')}</p>
          <div className="space-y-3">
            <Field label={t('sizeLabel')}>
              <input
                type="number"
                step="0.1"
                min="0.6"
                max="3"
                value={settings.originalSize}
                onChange={(e) => set('originalSize', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label={t('weightLabel')}>
              <input
                type="number"
                step="100"
                min="100"
                max="900"
                value={settings.originalWeight}
                onChange={(e) => set('originalWeight', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label={t('colorLabel')}>
              <input
                type="color"
                value={settings.originalColor}
                onChange={(e) => set('originalColor', e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white cursor-pointer"
              />
            </Field>
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-stone-50 p-4">
          <p className="text-sm font-bold text-slate-900 mb-3">{t('translatedCaptions')}</p>
          <div className="space-y-3">
            <Field label={t('sizeLabel')}>
              <input
                type="number"
                step="0.1"
                min="0.6"
                max="3"
                value={settings.translatedSize}
                onChange={(e) => set('translatedSize', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label={t('weightLabel')}>
              <input
                type="number"
                step="100"
                min="100"
                max="900"
                value={settings.translatedWeight}
                onChange={(e) => set('translatedWeight', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label={t('colorLabel')}>
              <input
                type="color"
                value={settings.translatedColor}
                onChange={(e) => set('translatedColor', e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white cursor-pointer"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Riquadro */}
      <div className="rounded-xl border border-slate-100 bg-stone-50 p-4 mb-5">
        <p className="text-sm font-bold text-slate-900 mb-3">{t('captionBox')}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t('positionLabel')}>
            <select
              value={settings.captionPosition}
              onChange={(e) => set('captionPosition', e.target.value)}
              className={inputCls}
            >
              <option value="bottom">{t('positionBottom')}</option>
              <option value="top">{t('positionTop')}</option>
            </select>
          </Field>
          <Field label={t('backgroundLabel')}>
            <input
              type="text"
              value={settings.captionBackground}
              onChange={(e) => set('captionBackground', e.target.value)}
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label={t('radiusLabel')}>
            <input
              type="text"
              value={settings.captionRadius}
              onChange={(e) => set('captionRadius', e.target.value)}
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label={t('paddingLabel')}>
            <input
              type="text"
              value={settings.captionPadding}
              onChange={(e) => set('captionPadding', e.target.value)}
              className={`${inputCls} font-mono`}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t('marginLabel')}>
              <input
                type="text"
                value={settings.captionHorizontalMargin}
                onChange={(e) => set('captionHorizontalMargin', e.target.value)}
                className={`${inputCls} font-mono`}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Anteprima */}
      <div className="mb-5">
        <p className="text-sm font-bold text-slate-900 mb-2">{t('previewTitle')}</p>
        <div className={`rounded-xl overflow-hidden bg-slate-950 aspect-video max-h-56 flex flex-col ${settings.captionPosition === 'top' ? 'justify-start' : 'justify-end'}`}>
          <div className={`text-center ${settings.captionPosition === 'top' ? 'mt-6' : 'mb-6'}`}>
            <div style={boxStyle} className="inline-block max-w-full">
              {settings.showOriginalCaptions && (
                <div style={originalStyle} className="leading-snug opacity-80">
                  {t('previewOriginal')}
                </div>
              )}
              {settings.showCaptions && (
                <div style={translatedStyle} className="leading-snug">
                  {t('previewTranslated')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {notice && (
        <p className="mb-4 text-sm font-medium text-primary flex items-center gap-2">
          <Subtitles className="w-4 h-4 shrink-0" />
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/25 disabled:opacity-60 text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? t('saving') : t('saveChanges')}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition-all text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          {t('resetDefaults')}
        </button>
      </div>
    </div>
  )
}

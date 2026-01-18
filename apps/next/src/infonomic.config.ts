// This file simulates our standard CMS / Collections deployment config
// for the Infonomic app, defining which languages are available
// for translated content and for the AI assistant.

export type LanguageMap = Record<string, { nativeName: string }>

// Determines which languages are available as translated content.
// NOTE: there must be a matching set of languages in
// @/i18n/settings.ts so that corresponding locale routes
// will work.
export const availableLanguageMap: LanguageMap = {
  en: { nativeName: 'English' },
  th: { nativeName: 'ไทย' },
  lo: { nativeName: 'ລາວ' },
  vi: { nativeName: 'Tiếng Việt' },
  km: { nativeName: 'ខ្មែរ' },
}

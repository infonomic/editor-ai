export const MODEL_KEY = 'GEMINI'
export const MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash'] as const

export type GoogleModel = (typeof MODELS)[number]

export const DEFAULT_MODEL: GoogleModel = 'gemini-2.5-flash'

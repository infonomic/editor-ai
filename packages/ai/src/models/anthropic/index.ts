export const MODEL_KEY = 'ANTH-C'
export const MODELS = [
  'claude-opus-4-5-20251101',
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-5-20250929',
] as const

export type AnthropicModel = (typeof MODELS)[number]

export const DEFAULT_MODEL: AnthropicModel = 'claude-haiku-4-5-20251001'

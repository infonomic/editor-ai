export const MODEL_KEY = 'Oai'
export const MODELS = [
  'gpt-5.2',
  'gpt-5.2-pro',
  'gpt-5',
  'gpt-5-pro',
  'gpt-5-mini',
  'gpt-5-nano',
] as const

export type OpenAIModel = (typeof MODELS)[number]

export const DEFAULT_MODEL: OpenAIModel = 'gpt-5.2'

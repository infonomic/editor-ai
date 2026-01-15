import { z } from 'zod'

export const PROVIDERS = ['openai', 'google', 'anthropic'] as const

export const CHAT_APIS = ['native', 'vercel'] as const
export type ChatApi = (typeof CHAT_APIS)[number]

export const normalizeChatApi = (value: unknown): ChatApi => {
  if (typeof value !== 'string') return 'native'
  const normalized = value.trim().toLowerCase()
  return normalized === 'vercel' ? 'vercel' : 'native'
}

export interface InstructionState {
  errors: {
    prompt?: string[] | undefined
    editor?: string[] | undefined
  }
  message?: string
  editor?: any
  html?: string
  format?: 'lexical' | 'html'
  prompt?: string
  lastRun?: number | null
  status: 'success' | 'failed' | 'idle'
}

export const instructionSchema = z.object({
  prompt: z
    .string({
      error: (issue) =>
        issue.input === undefined ? 'Prompt input is required.' : 'Prompt input must be a string.',
    })
    .min(3, {
      error: 'Prompt input must be 3 or more characters long.',
    })
    .transform((s) => s.trim())
    .refine((s) => s.length > 0, 'Prompt input cannot be empty.'),
  editor: z.string({
    error: (issue) =>
      issue.input === undefined ? 'Editor state is required.' : 'Editor state must be a string.',
  }),
  provider: z.enum(PROVIDERS, {
    error: 'Provider must be one of openai, google, or anthropic.',
  }),
  model: z.string({
    error: (issue) =>
      issue.input === undefined ? 'Model is required.' : 'Model must be a string.',
  }),
  api: z.enum(CHAT_APIS, {
    error: 'API must be one of native or vercel.',
  }),
})

export type Provider = z.infer<typeof instructionSchema>['provider']
export type InstructionApi = z.infer<typeof instructionSchema>['api']

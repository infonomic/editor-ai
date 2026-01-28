/**
 * Credit: Adapted from https://github.com/ashbuilds/payload-ai
 * Portions copyright Ash Builds, licensed under MIT.
 */

import type { CSSProperties, MouseEventHandler } from 'react'

import type { ImageGenerateParams } from 'openai/resources/images'
import { z } from 'zod'

export const PROVIDERS = ['openai', 'google', 'anthropic'] as const

export type OutputPreference =
  | { type: 'structured' }
  | { type: 'html' }
  | { type: 'text'; length: 'short' | 'long'; maxLength?: number }

export type ExecuteInstructionParams = {
  prompt: string
  editor: string
  api: InstructionApi
  provider: Provider
  model: string
  output?: OutputPreference
}

export type ExecuteInstructionOptions = {
  signal?: AbortSignal
  timeoutMs?: number
  telemetryContext?: Record<string, unknown>
}

export const APIS = ['native', 'vercel'] as const
export type AiApi = (typeof APIS)[number]

export const normalizeAiApi = (value: unknown): AiApi => {
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
  api: z.enum(APIS, {
    error: 'API must be one of native or vercel.',
  }),
})

export type Provider = z.infer<typeof instructionSchema>['provider']
export type InstructionApi = z.infer<typeof instructionSchema>['api']

export interface GenerationModel {
  fields: string[]
  generateText?: (prompt: string, system: string) => Promise<string>
  handler?: (prompt: string, options: any) => Promise<any> | Response
  id: string
  name: string
  output: 'audio' | 'file' | 'image' | 'json' | 'text' | 'video'
  // settings?: GroupField
  supportsPromptOptimization?: boolean
}

export interface GenerationConfig {
  models: GenerationModel[]
  provider: string
}

export type ActionMenuItems =
  | 'Compose'
  | 'Expand'
  | 'Proofread'
  | 'Rephrase'
  | 'Settings'
  | 'Simplify'
  | 'Summarize'
  | 'Tone'
  | 'Translate'

export type ActionPromptOptions = {
  layout?: string
  locale?: string
  prompt?: string
  systemPrompt?: string
}

export type ActionPrompt = {
  layout?: (options?: ActionPromptOptions) => string
  name: ActionMenuItems
  system: (options: ActionPromptOptions) => string
}

export type SeedPromptOptions = {
  fieldLabel: string
  fieldSchemaPaths: Record<string, any>
  fieldType: string
  path: string
}

export type ActionMenuEvents =
  | 'onCompose'
  | 'onExpand'
  | 'onProofread'
  | 'onRephrase'
  | 'onSettings'
  | 'onSimplify'
  | 'onSummarize'
  | 'onTone'
  | 'onTranslate'

export type UseMenuEvents = {
  [key in ActionMenuEvents]?: (data?: unknown) => void
}

export type UseMenuOptions = {
  isConfigAllowed: boolean
}

export type BaseItemProps<T = any> = {
  children?: React.ReactNode
  disabled?: boolean
  hideIcon?: boolean
  isActive?: boolean
  isMenu?: boolean
  onClick: (data?: unknown) => void
  onMouseEnter?: MouseEventHandler<T> | undefined
  onMouseLeave?: MouseEventHandler<T> | undefined
  style?: CSSProperties | undefined
  title?: string
}

export type ImageReference = {
  data: Blob
  name: string
  size: number
  type: string
  url: string
}

export type GenerateImageParams = {
  images?: ImageReference[]
  size?: ImageGenerateParams['size']
  style?: ImageGenerateParams['style']
  version?: ImageGenerateParams['model']
}

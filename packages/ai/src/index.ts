export { executeInstruction } from '@/execute-instruction'
export { executeInstructionStreaming } from '@/execute-instruction-streaming'
export { generateDocument, generateDocumentStreaming } from '@/generate-document'
export { patchDocument, patchDocumentStreaming } from '@/patch-document'
export type { AiApi, InstructionState, Provider } from '@/@types'
export type {
  GenerateDocumentError,
  GenerateDocumentOptions,
  GenerateDocumentResult,
  GenerateDocumentStreamingResult,
} from '@/generate-document'
export type {
  PatchDocumentError,
  PatchDocumentOptions,
  PatchDocumentResult,
  PatchDocumentStreamingResult,
} from '@/patch-document'

import {
  DEFAULT_MODEL as ANTHROPIC_DEFAULT_MODEL,
  MODELS as ANTHROPIC_MODELS,
} from '@/models/anthropic'
import { DEFAULT_MODEL as GOOGLE_DEFAULT_MODEL, MODELS as GOOGLE_MODELS } from '@/models/google'
import { DEFAULT_MODEL as OPENAI_DEFAULT_MODEL, MODELS as OPENAI_MODELS } from '@/models/openai'
import type { AiApi, Provider } from '@/@types'

export const PROVIDER_MODELS: Record<Provider, readonly string[]> = {
  openai: OPENAI_MODELS,
  google: GOOGLE_MODELS,
  anthropic: ANTHROPIC_MODELS,
}

export const isProvider = (value: string): value is Provider => {
  return value === 'openai' || value === 'google' || value === 'anthropic'
}

export const getDefaultModel = (provider: Provider): string => {
  if (!isProvider(provider)) {
    throw new Error(`Invalid provider: ${provider}`)
  }

  switch (provider) {
    case 'openai':
      return OPENAI_DEFAULT_MODEL
    case 'google':
      return GOOGLE_DEFAULT_MODEL
    case 'anthropic':
      return ANTHROPIC_DEFAULT_MODEL
  }
}

export const normalizeChatApi = (value: unknown): AiApi => {
  if (typeof value !== 'string') return 'native'
  const normalized = value.trim().toLowerCase()
  return normalized === 'vercel' ? 'vercel' : 'native'
}

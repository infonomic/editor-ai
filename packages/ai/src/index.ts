export { getAiServerConfig } from './config/ai-config'
export { executeInstruction, executeInstructionStreaming } from './execute'
export { generateStructured, generateStructuredStreaming } from './generate'
export { patch, patchStreaming } from './patch'
export type {
  AiApi,
  ExecuteInstruction,
  ExecuteInstructionOptions,
  ExecuteInstructionParams,
  InstructionState,
  OutputPreference,
  Provider,
} from './@types'
export type { ExecuteInstructionStreamingResult } from './execute'
export type {
  GenerateError,
  GenerateOptions,
  GenerateResult,
  GenerateStreamingResult,
} from './generate'
export type {
  PatchError,
  PatchOptions,
  PatchResult,
  PatchStreamingResult,
} from './patch'

import {
  DEFAULT_MODEL as ANTHROPIC_DEFAULT_MODEL,
  MODELS as ANTHROPIC_MODELS,
} from './models/anthropic'
import { DEFAULT_MODEL as GOOGLE_DEFAULT_MODEL, MODELS as GOOGLE_MODELS } from './models/google'
import { DEFAULT_MODEL as OPENAI_DEFAULT_MODEL, MODELS as OPENAI_MODELS } from './models/openai'
import type { AiApi, Provider } from '@/@types'

export const PROVIDERS: Array<[Provider, string]> = [
  ['openai', 'OpenAI'],
  ['google', 'Google'],
  ['anthropic', 'Anthropic'],
]

export const AI_APIS: AiApi[] = ['native', 'vercel']

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

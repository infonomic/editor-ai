import Ajv from 'ajv'

import {
  getGenerateDoc as getGenerateAnthropicDoc,
  getGenerateDocStreaming as getGenerateAnthropicDocStreaming,
  getGenerateHtml as getGenerateAnthropicHtml,
} from '@/ai/models/anthropic/generate'
import {
  getGenerateDoc as getGenerateGeminiDoc,
  getGenerateDocStreaming as getGenerateGeminiDocStreaming,
  getGenerateHtml as getGenerateGeminiHtml,
} from '@/ai/models/google/generate'
import {
  getGenerateDoc as getGenerateOpenAIDoc,
  getGenerateDocStreaming as getGenerateOpenAIDocStreaming,
  getGenerateHtml as getGenerateOpenAIHtml,
} from '@/ai/models/openai/generate'
import { documentSchema } from '@/ai/schemas/lexical-json-schema'
import { getLogger } from '@/lib/logger'
import { convertToLexical } from '@/modules/editor-chat/convert-to-lexical'
import type { ChatApi, Provider } from './@types'

const ajv = new Ajv({ allErrors: true, strict: false })
const validateLexicalDocument = ajv.compile(documentSchema as any)
const logger = getLogger()

export interface GenerateDocumentOptions {
  provider: Provider
  apiKey: string
  modelName: string
  prompt: string
  api: ChatApi
  signal?: AbortSignal
}

export type GenerateDocumentResult =
  | {
      success: true
      format: 'lexical'
      editor: any
      message: string
    }
  | {
      success: true
      format: 'html'
      html: string
      message: string
    }

export type GenerateDocumentStreamingResult = {
  text: AsyncIterable<string>
  final: Promise<GenerateDocumentResult | GenerateDocumentError>
}

export interface GenerateDocumentError {
  success: false
  message: string
  errors: Record<string, string[]>
}

async function processGenerationResult(
  generated: any,
  options: GenerateDocumentOptions
): Promise<GenerateDocumentResult | GenerateDocumentError> {
  const { provider, apiKey, modelName, prompt, api, signal } = options

  const generatedDocument = convertToLexical(generated)

  const isValid = validateLexicalDocument(generatedDocument)
  if (isValid) {
    return {
      success: true,
      format: 'lexical',
      editor: generatedDocument,
      message: 'Task completed successfully via AI instruction (generate mode).',
    }
  }

  const validationErrors = (validateLexicalDocument.errors ?? []).map((e) => {
    const instancePath = e.instancePath ? ` at ${e.instancePath}` : ''
    const message = e.message ?? 'Schema validation error'
    return `${message}${instancePath}`
  })

  logger.warn({ errors: validationErrors }, 'Lexical validation failed, attempting HTML fallback')

  // Fallback: generate HTML when the model cannot reliably produce valid Lexical JSON.
  const generateHtml =
    provider === 'openai'
      ? getGenerateOpenAIHtml(api)
      : provider === 'google'
        ? getGenerateGeminiHtml(api)
        : getGenerateAnthropicHtml(api)

  try {
    const html = await generateHtml({ apiKey, model: modelName, prompt, signal })
    const trimmedHtml = html?.trim() ?? ''
    if (trimmedHtml.length > 0) {
      return {
        success: true,
        format: 'html',
        html: trimmedHtml,
        message: 'Generated HTML fallback (Lexical JSON validation failed).',
      }
    }
  } catch (error) {
    logger.error(error, 'HTML fallback generation failed')
  }

  return {
    success: false,
    message: 'AI failed to generate a valid Lexical document (and HTML fallback was empty).',
    errors: {
      editor: validationErrors,
    },
  }
}

/**
 * Generates a new Lexical document from scratch based on a user prompt.
 * Uses the documentSchema to ensure the AI generates valid Lexical JSON
 * with proper structure including headings, paragraphs, lists, etc.
 */
export async function generateDocument(
  options: GenerateDocumentOptions
): Promise<GenerateDocumentResult | GenerateDocumentError> {
  const { provider, apiKey, modelName, prompt, api, signal } = options

  const generate =
    provider === 'openai'
      ? getGenerateOpenAIDoc(api)
      : provider === 'google'
        ? getGenerateGeminiDoc(api)
        : getGenerateAnthropicDoc(api)

  const generated = await generate({ apiKey, model: modelName, prompt, signal })

  return processGenerationResult(generated, options)
}

/**
 * Streams a Lexical document generation.
 */
export function generateDocumentStreaming(
  options: GenerateDocumentOptions
): GenerateDocumentStreamingResult {
  const { provider, apiKey, modelName, prompt, api, signal } = options

  const generateStreaming =
    provider === 'openai'
      ? getGenerateOpenAIDocStreaming(api)
      : provider === 'google'
        ? getGenerateGeminiDocStreaming(api)
        : getGenerateAnthropicDocStreaming(api)

  const streamResult = generateStreaming({
    apiKey,
    model: modelName,
    prompt,
    signal,
  })

  const final = (async (): Promise<GenerateDocumentResult | GenerateDocumentError> => {
    const generated = await streamResult.final
    return processGenerationResult(generated, options)
  })()

  return { text: streamResult.text, final }
}

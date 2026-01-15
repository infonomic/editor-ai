import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import Ajv from 'ajv'

import { anthropic as anthropicProvider } from '@/ai/models/anthropic/anthropic'
import { generateDoc as generateAnthropicDoc } from '@/ai/models/anthropic/generate'
import { generateDoc as generateGeminiDoc } from '@/ai/models/google/generate'
import { generateDoc as generateOpenAIDoc } from '@/ai/models/openai/generate'
import { documentSchema } from '@/ai/schemas/lexicalJsonSchema'
import { convertToLexical, type GeneratedDoc } from '@/modules/editor-chat/convert-to-lexical'
import type { Provider } from './@types'

const ajv = new Ajv({ allErrors: true, strict: false })
const validateLexicalDocument = ajv.compile(documentSchema as any)

/**
 * System prompt for GENERATE mode: creating a new Lexical document from scratch.
 */
const buildGenerateHtmlSystemPrompt = () => {
  return [
    'You are writing HTML for a rich text editor.',
    'Return ONLY valid HTML (no Markdown, no code fences).',
    'Use semantic tags: h1/h2/h3, p, ul/ol/li, blockquote, strong, em.',
    'Do not include <html>, <head>, or <body> wrappers.',
  ].join('\n')
}

const buildGenerateHtmlUserPrompt = (instruction: string) => {
  return `Write HTML for the following request:\n\n${instruction}`
}

export interface GenerateDocumentOptions {
  provider: Provider
  apiKey: string
  modelName: string
  prompt: string
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

export interface GenerateDocumentError {
  success: false
  message: string
  errors: Record<string, string[]>
}

/**
 * Generates a new Lexical document from scratch based on a user prompt.
 * Uses the documentSchema to ensure the AI generates valid Lexical JSON
 * with proper structure including headings, paragraphs, lists, etc.
 */
export async function generateDocument(
  options: GenerateDocumentOptions
): Promise<GenerateDocumentResult | GenerateDocumentError> {
  const { provider, apiKey, modelName, prompt } = options

  let generated: GeneratedDoc
  if (provider === 'openai') {
    generated = await generateOpenAIDoc({ apiKey, model: modelName, prompt })
  } else if (provider === 'google') {
    generated = await generateGeminiDoc({ apiKey, model: modelName, prompt })
  } else {
    generated = await generateAnthropicDoc({ apiKey, model: modelName, prompt })
  }

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

  // Fallback: generate HTML when the model cannot reliably produce valid Lexical JSON.
  const htmlModel =
    provider === 'openai'
      ? createOpenAI({ apiKey })(modelName)
      : provider === 'google'
        ? createGoogleGenerativeAI({ apiKey })(modelName)
        : anthropicProvider(apiKey)(modelName)

  const htmlResult = await generateText({
    model: htmlModel,
    system: buildGenerateHtmlSystemPrompt(),
    prompt: buildGenerateHtmlUserPrompt(prompt),
  })

  const html = htmlResult.text?.trim() ?? ''
  if (html.length > 0) {
    return {
      success: true,
      format: 'html',
      html,
      message: 'Generated HTML fallback (Lexical JSON validation failed).',
    }
  }

  const validationErrors = (validateLexicalDocument.errors ?? []).map((e) => {
    const instancePath = e.instancePath ? ` at ${e.instancePath}` : ''
    const message = e.message ?? 'Schema validation error'
    return `${message}${instancePath}`
  })

  return {
    success: false,
    message: 'AI failed to generate a valid Lexical document (and HTML fallback was empty).',
    errors: {
      editor: validationErrors,
    },
  }
}

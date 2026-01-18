import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, jsonSchema, Output, streamText } from 'ai'

import {
  buildGenerateHtmlSystemPrompt,
  buildGenerateHtmlUserPrompt,
  buildGenerateSystemPrompt,
} from '@/ai/prompts'
import { normalizeGeneratedDoc } from './normalize-generated-doc'
import { geminiGenerationSchema, geminiGenerationSchema2 } from './schema'
import type { GeneratedDoc } from '@/modules/editor-chat/convert-to-lexical'

export async function generateHtml(options: {
  apiKey: string
  model: string
  prompt: string
  signal?: AbortSignal
}): Promise<string> {
  const google = createGoogleGenerativeAI({ apiKey: options.apiKey })

  const result = await generateText({
    model: google(options.model),
    system: buildGenerateHtmlSystemPrompt(),
    prompt: buildGenerateHtmlUserPrompt(options.prompt),
    abortSignal: options.signal,
  })

  return result.text
}

export async function generateDoc(options: {
  apiKey: string
  model: string
  prompt: string
  signal?: AbortSignal
}): Promise<GeneratedDoc> {
  const google = createGoogleGenerativeAI({ apiKey: options.apiKey })

  const schema = jsonSchema<GeneratedDoc>({
    ...(geminiGenerationSchema2 as any),
    $schema: undefined,
  })

  const result = await generateText({
    model: google(options.model),
    system: buildGenerateSystemPrompt(),
    prompt: options.prompt,
    abortSignal: options.signal,
    output: Output.object({
      schema,
    }),
  })

  return normalizeGeneratedDoc(result.output)
}

export type GenerateDocStreamingResult = {
  text: AsyncIterable<string>
  final: Promise<GeneratedDoc>
}

export function generateDocStreaming(options: {
  apiKey: string
  model: string
  prompt: string
  signal?: AbortSignal
}): GenerateDocStreamingResult {
  const google = createGoogleGenerativeAI({ apiKey: options.apiKey })

  const schema = jsonSchema<GeneratedDoc>({
    ...(geminiGenerationSchema as any),
    $schema: undefined,
  })

  const result = streamText({
    model: google(options.model),
    system: buildGenerateSystemPrompt(),
    prompt: options.prompt,
    abortSignal: options.signal,
    output: Output.object({
      schema,
    }),
  })

  return {
    text: result.textStream,
    final: (result.output as Promise<unknown>).then(normalizeGeneratedDoc),
  }
}

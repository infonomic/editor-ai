import { createOpenAI } from '@ai-sdk/openai'
import { generateText, jsonSchema, Output, streamText } from 'ai'

import {
  buildGenerateHtmlSystemPrompt,
  buildGenerateHtmlUserPrompt,
  buildGenerateSystemPrompt,
  buildGenerateTextSystemPrompt,
  buildGenerateTextUserPrompt,
} from '@/prompts'
import { openaiGenerationSchema } from './schema'
import type { GeneratedDoc } from '@/utils/convert-to-lexical'

export type GenerateDocStreamingResult = {
  text: AsyncIterable<string>
  final: Promise<GeneratedDoc>
}

export async function generateHtml(options: {
  apiKey: string
  model: string
  prompt: string
  signal?: AbortSignal
}): Promise<string> {
  const openai = createOpenAI({ apiKey: options.apiKey })

  const result = await generateText({
    model: openai(options.model),
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
  const openai = createOpenAI({ apiKey: options.apiKey })

  const schema = jsonSchema<GeneratedDoc>({
    ...((openaiGenerationSchema as any).schema ?? openaiGenerationSchema),
    $schema: undefined,
  })

  const result = await generateText({
    model: openai(options.model),
    system: buildGenerateSystemPrompt(),
    prompt: options.prompt,
    abortSignal: options.signal,
    output: Output.object({
      schema,
    }),
  })

  return result.output as GeneratedDoc
}

export function generateDocStreaming(options: {
  apiKey: string
  model: string
  prompt: string
  signal?: AbortSignal
}): GenerateDocStreamingResult {
  const openai = createOpenAI({ apiKey: options.apiKey })

  const schema = jsonSchema<GeneratedDoc>({
    ...((openaiGenerationSchema as any).schema ?? openaiGenerationSchema),
    $schema: undefined,
  })

  const result = streamText({
    model: openai(options.model),
    system: buildGenerateSystemPrompt(),
    prompt: options.prompt,
    abortSignal: options.signal,
    output: Output.object({
      schema,
    }),
  })

  return {
    text: result.textStream,
    final: result.output as Promise<GeneratedDoc>,
  }
}

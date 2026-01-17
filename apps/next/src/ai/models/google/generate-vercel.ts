import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, jsonSchema, Output, streamText } from 'ai'

import { buildGenerateSystemPrompt } from '@/ai/prompts'
import { geminiGenerationSchema } from './schema'
import type { GeneratedDoc } from '@/modules/editor-chat/convert-to-lexical'

export async function generateDoc(options: {
  apiKey: string
  model: string
  prompt: string
  signal?: AbortSignal
}): Promise<GeneratedDoc> {
  const google = createGoogleGenerativeAI({ apiKey: options.apiKey })

  const schema = jsonSchema<GeneratedDoc>({
    ...(geminiGenerationSchema as any),
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

  return result.output as GeneratedDoc
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
    final: result.output as Promise<GeneratedDoc>,
  }
}

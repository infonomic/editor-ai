import { generateText, jsonSchema, Output, streamText } from 'ai'

import { buildGenerateSystemPrompt } from '@/ai/prompts'
import { anthropic } from './anthropic'
import { anthropicGenerationSchema } from './schema'
import type { GeneratedDoc } from '@/modules/editor-chat/convert-to-lexical'

export async function generateDoc(options: {
  apiKey: string
  model: string
  prompt: string
  signal?: AbortSignal
}): Promise<GeneratedDoc> {
  const schema = jsonSchema<GeneratedDoc>({
    ...(anthropicGenerationSchema as any),
    $schema: undefined,
  })

  const result = await generateText({
    model: anthropic(options.apiKey)(options.model),
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
  const schema = jsonSchema<GeneratedDoc>({
    ...(anthropicGenerationSchema as any),
    $schema: undefined,
  })

  const result = streamText({
    model: anthropic(options.apiKey)(options.model),
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

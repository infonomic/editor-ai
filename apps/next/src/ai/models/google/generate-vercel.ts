import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, jsonSchema, Output, streamText } from 'ai'

import { geminiGenerationSchema } from './schema'
import type { GeneratedDoc } from '@/modules/editor-chat/convert-to-lexical'

const buildSystem = () => {
  return [
    'You are generating a rich text document using a shallow block structure.',
    'Return JSON only, matching the provided JSON Schema.',
    '',
    'RULES:',
    '- Use title for the document title (or null if none).',
    '- blocks is a flat array of block objects.',
    '- Avoid recursion: do not nest blocks inside blocks except quote.blocks and list.items[].blocks.',
    '- Keep unions shallow by using kind discriminator fields.',
    '',
    'INLINE RULES:',
    '- Each inline is one of: text, link, br.',
    '- marks must always be present, with all four boolean fields.',
  ].join('\n')
}

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
    system: buildSystem(),
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
    system: buildSystem(),
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

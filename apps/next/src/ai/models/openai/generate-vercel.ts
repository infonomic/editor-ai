import { createOpenAI } from '@ai-sdk/openai'
import { generateText, jsonSchema, Output } from 'ai'

import { openaiGenerationSchema } from './schema'
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
    '',
    'LIST RULES:',
    '- list.items[].indent must be 0 or 1 only.',
    '- list.items[].blocks must be paragraphs only.',
    '',
    'QUOTE RULES:',
    '- quote.blocks must be paragraphs only (no nested quote/list).',
  ].join('\n')
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
    system: buildSystem(),
    prompt: options.prompt,
    abortSignal: options.signal,
    output: Output.object({
      schema,
    }),
  })

  return result.output as GeneratedDoc
}

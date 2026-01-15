import { generateText, jsonSchema, Output } from 'ai'

import { anthropic } from './anthropic'
import { anthropicGenerationSchema } from './schema'
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
    'LIST/QUOTE:',
    '- Quote blocks contain paragraphs only.',
    '- List items contain paragraphs only and indent is 0 or 1.',
  ].join('\n')
}

export async function generateDoc(options: {
  apiKey: string
  model: string
  prompt: string
}): Promise<GeneratedDoc> {
  const schema = jsonSchema<GeneratedDoc>({
    ...(anthropicGenerationSchema as any),
    $schema: undefined,
  })

  const result = await generateText({
    model: anthropic(options.apiKey)(options.model),
    system: buildSystem(),
    prompt: options.prompt,
    output: Output.object({
      schema,
    }),
  })

  return result.output as GeneratedDoc
}

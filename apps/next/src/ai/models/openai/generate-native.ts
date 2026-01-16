import OpenAI from 'openai'

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
}): Promise<GeneratedDoc> {
  const client = new OpenAI({ apiKey: options.apiKey })

  // OpenAI Structured Outputs expects `text.format` to be a json_schema format.
  // Our `openaiGenerationSchema` matches the OpenAI shape (name/strict/schema),
  // but we add the required discriminator here.
  const format = {
    type: 'json_schema',
    ...openaiGenerationSchema,
  } as any

  const result = await client.responses.parse({
    model: options.model,
    input: [
      {
        role: 'system',
        content: buildSystem(),
      },
      {
        role: 'user',
        content: options.prompt,
      },
    ],
    text: {
      format,
    },
  })

  console.log(result.usage)

  // If the model refused, the parsed output will be missing.
  const refusal = (result as any)?.output?.[0]?.content?.find(
    (c: any) => c?.type === 'refusal'
  )?.refusal
  if (typeof refusal === 'string' && refusal.length > 0) {
    throw new Error(refusal)
  }

  const parsed = (result as any).output_parsed as GeneratedDoc | undefined
  if (parsed && typeof parsed === 'object') {
    return parsed
  }

  throw new Error('OpenAI structured output did not return a parsed object.')
}

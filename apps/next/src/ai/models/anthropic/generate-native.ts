import Anthropic from '@anthropic-ai/sdk'

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

const isValidHttpUrl = (value: string | undefined): value is string => {
  if (value == null || value.trim().length === 0) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// The official Anthropic SDK expects a base URL like https://api.anthropic.com
// (it will handle the /v1 path internally). We defensively normalize env input.
const normalizeAnthropicBaseURLForSdk = (value: string | undefined) => {
  const base = (value && value.trim().length > 0 ? value : 'https://api.anthropic.com')
    .trim()
    .replace(/\/+$/, '')

  return base.endsWith('/v1') ? base.slice(0, -3) : base
}

export async function generateDoc(options: {
  apiKey: string
  model: string
  prompt: string
  signal?: AbortSignal
}): Promise<GeneratedDoc> {
  const baseURL = isValidHttpUrl(process.env.ANTHROPIC_BASE_URL)
    ? normalizeAnthropicBaseURLForSdk(process.env.ANTHROPIC_BASE_URL)
    : 'https://api.anthropic.com'

  const client = new Anthropic({ apiKey: options.apiKey, baseURL })

  // Anthropic-native structured outputs: force a tool call and parse the tool input.
  const toolName = 'generate_lexical_doc_blocks_v1'

  // Anthropic does not need the draft-07 $schema keyword.
  const input_schema = {
    ...(anthropicGenerationSchema as any),
    $schema: undefined,
  }

  const result = await client.messages.create(
    {
      model: options.model,
      max_tokens: 4000,
      system: buildSystem(),
      messages: [
        {
          role: 'user',
          content: options.prompt,
        },
      ],
      tools: [
        {
          name: toolName,
          description: 'Generate a document in the GeneratedDoc (blocks) JSON format.',
          input_schema,
        },
      ],
      tool_choice: { type: 'tool', name: toolName },
    },
    options.signal ? { signal: options.signal } : undefined
  )

  // Find the tool call content and return its JSON input.
  const toolUse = (result.content ?? []).find(
    (c: any) => c?.type === 'tool_use' && c?.name === toolName
  ) as any

  const parsed = toolUse?.input as GeneratedDoc | undefined
  if (parsed && typeof parsed === 'object') {
    return parsed
  }

  const text = (result.content ?? [])
    .filter((c: any) => c?.type === 'text')
    .map((c: any) => c?.text)
    .filter((t: any) => typeof t === 'string' && t.length > 0)
    .join('\n')

  throw new Error(
    text.length > 0
      ? `Anthropic did not return a tool payload. Text: ${text}`
      : 'Anthropic did not return a tool payload.'
  )
}

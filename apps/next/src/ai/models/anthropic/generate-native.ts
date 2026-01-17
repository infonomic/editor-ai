import Anthropic from '@anthropic-ai/sdk'

import {
  buildGenerateHtmlSystemPrompt,
  buildGenerateHtmlUserPrompt,
  buildGenerateSystemPrompt,
} from '@/ai/prompts'
import { anthropicGenerationSchema } from './schema'
import type { GeneratedDoc } from '@/modules/editor-chat/convert-to-lexical'

export async function generateHtml(options: {
  apiKey: string
  model: string
  prompt: string
  signal?: AbortSignal
}): Promise<string> {
  const baseURL = isValidHttpUrl(process.env.ANTHROPIC_BASE_URL)
    ? normalizeAnthropicBaseURLForSdk(process.env.ANTHROPIC_BASE_URL)
    : 'https://api.anthropic.com'

  const client = new Anthropic({ apiKey: options.apiKey, baseURL })

  const message = await client.messages.create(
    {
      model: options.model,
      max_tokens: 4096,
      system: buildGenerateHtmlSystemPrompt(),
      messages: [{ role: 'user', content: buildGenerateHtmlUserPrompt(options.prompt) }],
    },
    { signal: options.signal }
  )

  const textBlock = message.content.find((b) => b.type === 'text')
  return textBlock?.text ?? ''
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
      system: buildGenerateSystemPrompt(),
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
  const baseURL = isValidHttpUrl(process.env.ANTHROPIC_BASE_URL)
    ? normalizeAnthropicBaseURLForSdk(process.env.ANTHROPIC_BASE_URL)
    : 'https://api.anthropic.com'

  const client = new Anthropic({ apiKey: options.apiKey, baseURL })

  const toolName = 'generate_lexical_doc_blocks_v1'

  const input_schema = {
    ...(anthropicGenerationSchema as any),
    $schema: undefined,
  }

  const stream = client.messages.stream(
    {
      model: options.model,
      max_tokens: 4000,
      system: buildGenerateSystemPrompt(),
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
      stream: true,
    },
    options.signal ? { signal: options.signal } : undefined
  )

  const text = (async function* () {
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const deltaText = (event as any)?.delta?.text
        const deltaJson =
          (event as any)?.delta?.partial_json ??
          (event as any)?.delta?.input_json_delta?.partial_json

        if (typeof deltaText === 'string' && deltaText.length > 0) {
          yield deltaText
        } else if (typeof deltaJson === 'string' && deltaJson.length > 0) {
          yield deltaJson
        }
      }
    }
  })()

  const final = (async () => {
    const result = await stream.finalMessage()

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
  })()

  return { text, final }
}

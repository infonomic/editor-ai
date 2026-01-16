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

export type GenerateDocStreamingResult = {
  text: AsyncIterable<string>
  final: Promise<GeneratedDoc>
}

const getOutputText = (result: any) => {
  if (typeof result?.output_text === 'string') {
    return result.output_text
  }

  if (Array.isArray(result?.output)) {
    const texts: string[] = []
    for (const output of result.output) {
      if (output?.type !== 'message' || !Array.isArray(output?.content)) {
        continue
      }
      for (const content of output.content) {
        if (content?.type === 'output_text' && typeof content?.text === 'string') {
          texts.push(content.text)
        }
      }
    }
    if (texts.length > 0) {
      return texts.join('')
    }
  }

  return undefined
}

const parseGeneratedDoc = (result: any) => {
  const parsed = (result as any).output_parsed as GeneratedDoc | undefined
  if (parsed && typeof parsed === 'object') {
    return parsed
  }

  const outputText = getOutputText(result)
  if (typeof outputText === 'string' && outputText.trim().length > 0) {
    try {
      const json = JSON.parse(outputText)
      if (json && typeof json === 'object') {
        return json as GeneratedDoc
      }
    } catch {
      // fall through to error below
    }
  }

  throw new Error('OpenAI structured output did not return a parsed object.')
}

/***
 * Generates a document from OpenAI using structured outputs.
 */
export async function generateDoc(options: {
  apiKey: string
  model: string
  prompt: string
  signal?: AbortSignal
}): Promise<GeneratedDoc> {
  const client = new OpenAI({ apiKey: options.apiKey })

  // OpenAI Structured Outputs expects `text.format` to be a json_schema format.
  // Our `openaiGenerationSchema` matches the OpenAI shape (name/strict/schema),
  // but we add the required discriminator here.
  const format = {
    type: 'json_schema',
    ...openaiGenerationSchema,
  } as any

  const result = await client.responses.parse(
    {
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
    },
    options.signal ? { signal: options.signal } : undefined
  )

  // console.log(result.usage)

  // If the model refused, the parsed output will be missing.
  const refusal = (result as any)?.output?.[0]?.content?.find(
    (c: any) => c?.type === 'refusal'
  )?.refusal
  if (typeof refusal === 'string' && refusal.length > 0) {
    throw new Error(refusal)
  }

  return parseGeneratedDoc(result)
}

/***
 * Streams a document generation from OpenAI using structured outputs.
 */
export function generateDocStreaming(options: {
  apiKey: string
  model: string
  prompt: string
  signal?: AbortSignal
}): GenerateDocStreamingResult {
  const client = new OpenAI({ apiKey: options.apiKey })

  const format = {
    type: 'json_schema',
    ...openaiGenerationSchema,
  } as any

  const stream = client.responses.stream(
    {
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
      stream: true,
    },
    options.signal ? { signal: options.signal } : undefined
  )

  const text = (async function* () {
    for await (const event of stream) {
      if (event.type === 'response.output_text.delta') {
        yield event.delta
      }
    }
  })()

  const final = (async () => {
    const result = await stream.finalResponse()

    const refusal = (result as any)?.output?.[0]?.content?.find(
      (c: any) => c?.type === 'refusal'
    )?.refusal
    if (typeof refusal === 'string' && refusal.length > 0) {
      throw new Error(refusal)
    }

    return parseGeneratedDoc(result)
  })()

  return { text, final }
}

import OpenAI from 'openai'

import {
  buildGenerateHtmlSystemPrompt,
  buildGenerateHtmlUserPrompt,
  buildGenerateSystemPrompt,
} from '@/prompts'
import { openaiGenerationSchema, openaiHtmlGenerationSchema } from './schema'
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
  const client = new OpenAI({ apiKey: options.apiKey })

  const format = {
    type: 'json_schema',
    ...openaiHtmlGenerationSchema,
  } as any

  const result = await client.responses.parse(
    {
      model: options.model,
      input: [
        { role: 'system', content: buildGenerateHtmlSystemPrompt() },
        { role: 'user', content: buildGenerateHtmlUserPrompt(options.prompt) },
      ],
      text: {
        format,
      },
    },
    options.signal ? { signal: options.signal } : undefined
  )

  const parsed = (result as any).output_parsed
  if (parsed && typeof parsed === 'object' && typeof parsed.html === 'string') {
    return parsed.html
  }

  const outputText = getOutputText(result)
  if (typeof outputText === 'string' && outputText.trim().length > 0) {
    try {
      const json = JSON.parse(outputText)
      if (json && typeof json === 'object' && typeof json.html === 'string') {
        return json.html
      }
    } catch {
      // fall through
    }
  }

  const refusal = (result as any)?.output?.[0]?.content?.find(
    (c: any) => c?.type === 'refusal'
  )?.refusal
  if (typeof refusal === 'string' && refusal.length > 0) {
    throw new Error(refusal)
  }

  throw new Error('OpenAI structured output did not return a parsed HTML object.')
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
          content: buildGenerateSystemPrompt(),
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
          content: buildGenerateSystemPrompt(),
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

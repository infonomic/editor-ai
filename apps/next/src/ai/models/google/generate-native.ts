import { GoogleGenAI } from '@google/genai'

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
    '',
    'LIST/QUOTE:',
    '- Quote blocks contain paragraphs only.',
    '- List items contain paragraphs only and indent is 0 or 1.',
  ].join('\n')
}

const tryParseJson = (text: string): unknown => {
  const trimmed = text.trim()
  if (trimmed.length === 0) return undefined

  // Defensive: sometimes models wrap JSON in code fences.
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const candidate = fenced?.[1]?.trim() ?? trimmed

  return JSON.parse(candidate)
}

const normalizeJsonSchemaForGemini = (schema: unknown): unknown => {
  if (schema == null) return schema
  if (Array.isArray(schema)) return schema.map(normalizeJsonSchemaForGemini)
  if (typeof schema !== 'object') return schema

  const obj = schema as Record<string, any>
  const next: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'const') {
      next.enum = [value]
      continue
    }

    if (key === 'type' && Array.isArray(value)) {
      next.anyOf = value.map((t) => ({ type: t }))
      continue
    }

    next[key] = normalizeJsonSchemaForGemini(value)
  }

  return next
}

const normalizeGeneratedDoc = (doc: any): GeneratedDoc => {
  const normalizeAlign = (value: any): 'start' | 'center' | 'right' => {
    if (value === 'start' || value === 'center' || value === 'right') return value
    if (value === 'left') return 'start'
    return 'start'
  }

  const normalizeParagraph = (p: any) => {
    if (p && p.kind === 'paragraph') {
      p.align = normalizeAlign(p.align)
    }
  }

  const normalizeBlocks = (blocks: any[]) => {
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue

      if (block.kind === 'paragraph') {
        normalizeParagraph(block)
        continue
      }

      if (block.kind === 'quote' && Array.isArray(block.blocks)) {
        normalizeBlocks(block.blocks)
        continue
      }

      if (block.kind === 'list' && Array.isArray(block.items)) {
        for (const item of block.items) {
          if (item && Array.isArray(item.blocks)) {
            for (const paragraph of item.blocks) normalizeParagraph(paragraph)
          }
        }
      }
    }
  }

  if (doc && typeof doc === 'object' && Array.isArray(doc.blocks)) {
    normalizeBlocks(doc.blocks)
  }

  return doc as GeneratedDoc
}

export async function generateDoc(options: {
  apiKey: string
  model: string
  prompt: string
  signal?: AbortSignal
}): Promise<GeneratedDoc> {
  const ai = new GoogleGenAI({ apiKey: options.apiKey })

  // Google recommends using `responseJsonSchema` for full JSON Schema support.
  // Remove draft-07 $schema field to avoid confusing the API.
  const responseJsonSchema = {
    ...(geminiGenerationSchema as any),
    $schema: undefined,
  }

  const normalizedResponseJsonSchema = normalizeJsonSchemaForGemini(responseJsonSchema)

  const response = await ai.models.generateContent({
    model: options.model,
    contents: options.prompt,
    config: {
      systemInstruction: buildSystem(),
      responseMimeType: 'application/json',
      responseJsonSchema: normalizedResponseJsonSchema,
      abortSignal: options.signal,
    },
  })

  const text = response.text?.trim() ?? ''
  if (text.length === 0) {
    throw new Error('Google model returned an empty response.')
  }

  const parsed = tryParseJson(text)
  if (parsed && typeof parsed === 'object') {
    return normalizeGeneratedDoc(parsed)
  }

  throw new Error('Google structured output did not return a JSON object.')
}

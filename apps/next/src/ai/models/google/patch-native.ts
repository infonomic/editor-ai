import { GoogleGenAI } from '@google/genai'

import type { LexicalTextEditsResponse } from '@/modules/editor-chat/lexical-text-edits'

const buildPatchSystemPrompt = () => {
  return [
    'You are editing a Lexical document by updating text-node strings.',
    'You will receive an array of text nodes with numeric IDs and their current text.',
    '',
    'RULES:',
    '- Return EXACTLY one edit per input node ID (same count, same order).',
    '- Do not add, remove, or reorder IDs.',
    '- Update the text field for each node according to the user instruction.',
    '',
    'HANDLING EXISTING CONTENT:',
    '- Preserve the structure: do not merge or split text across nodes.',
    '- Apply the instruction to each node independently.',
    '- If a node is empty in the input, keep it empty unless the instruction explicitly requires filling it.',
  ].join('\n')
}

const buildPatchUserPrompt = (
  instruction: string,
  textNodes: Array<{ id: number; text: string }>
) => {
  return [
    `INSTRUCTION: ${instruction}`,
    '',
    'INPUT_TEXT_NODES_JSON:',
    JSON.stringify(textNodes),
  ].join('\n')
}

const tryParseJson = (text: string): unknown => {
  const trimmed = text.trim()
  if (trimmed.length === 0) return undefined

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

const normalizePatchResponse = (value: unknown): LexicalTextEditsResponse => {
  const maybeObj = value as any

  // Allow the model to return the edits array directly.
  const editsCandidate = Array.isArray(maybeObj)
    ? maybeObj
    : Array.isArray(maybeObj?.edits)
      ? maybeObj.edits
      : Array.isArray(maybeObj?.output)
        ? maybeObj.output
        : undefined

  if (!Array.isArray(editsCandidate)) {
    throw new Error('Google patch response is missing an edits array.')
  }

  const edits = editsCandidate
    .map((e: any) => {
      const idRaw = e?.id
      const textRaw = e?.text

      const id = typeof idRaw === 'number' ? idRaw : typeof idRaw === 'string' ? Number(idRaw) : NaN
      const text = typeof textRaw === 'string' ? textRaw : textRaw == null ? '' : String(textRaw)

      if (!Number.isFinite(id)) return undefined
      return { id, text }
    })
    .filter(Boolean) as Array<{ id: number; text: string }>

  return { edits }
}

const googlePatchSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    edits: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'number' },
          text: { type: 'string' },
        },
        required: ['id', 'text'],
      },
    },
  },
  required: ['edits'],
} as const

export async function patchDoc(options: {
  apiKey: string
  model: string
  prompt: string
  textNodes: Array<{ id: number; text: string }>
  signal?: AbortSignal
}): Promise<LexicalTextEditsResponse> {
  const ai = new GoogleGenAI({ apiKey: options.apiKey })

  const normalizedResponseJsonSchema = normalizeJsonSchemaForGemini(googlePatchSchema)

  const response = await ai.models.generateContent({
    model: options.model,
    contents: buildPatchUserPrompt(options.prompt, options.textNodes),
    config: {
      systemInstruction: buildPatchSystemPrompt(),
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
    return normalizePatchResponse(parsed)
  }

  throw new Error('Google structured output did not return a JSON object.')
}

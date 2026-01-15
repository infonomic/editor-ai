import OpenAI from 'openai'

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

const openaiPatchSchema = {
  name: 'lexical_text_edits_v1',
  strict: true,
  schema: {
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
  },
} as const

export async function patchDoc(options: {
  apiKey: string
  model: string
  prompt: string
  textNodes: Array<{ id: number; text: string }>
}): Promise<LexicalTextEditsResponse> {
  const client = new OpenAI({ apiKey: options.apiKey })

  const format = {
    type: 'json_schema',
    ...openaiPatchSchema,
  } as any

  const result = await client.responses.parse({
    model: options.model,
    input: [
      {
        role: 'system',
        content: buildPatchSystemPrompt(),
      },
      {
        role: 'user',
        content: buildPatchUserPrompt(options.prompt, options.textNodes),
      },
    ],
    text: {
      format,
    },
  })

  const refusal = (result as any)?.output?.[0]?.content?.find(
    (c: any) => c?.type === 'refusal'
  )?.refusal
  if (typeof refusal === 'string' && refusal.length > 0) {
    throw new Error(refusal)
  }

  const parsed = (result as any).output_parsed as LexicalTextEditsResponse | undefined
  if (parsed && typeof parsed === 'object') {
    return parsed
  }

  throw new Error('OpenAI structured output did not return a parsed object.')
}

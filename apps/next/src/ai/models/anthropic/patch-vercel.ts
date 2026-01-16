import { generateText, Output } from 'ai'

import {
  type LexicalTextEditsResponse,
  lexicalTextEditsResponseSchema,
} from '@/modules/editor-chat/lexical-text-edits'
import { anthropic } from './anthropic'

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

export async function patchDoc(options: {
  apiKey: string
  model: string
  prompt: string
  textNodes: Array<{ id: number; text: string }>
  signal?: AbortSignal
}): Promise<LexicalTextEditsResponse> {
  const result = await generateText({
    model: anthropic(options.apiKey)(options.model),
    system: buildPatchSystemPrompt(),
    prompt: buildPatchUserPrompt(options.prompt, options.textNodes),
    abortSignal: options.signal,
    output: Output.object({
      schema: lexicalTextEditsResponseSchema,
    }),
  })

  return result.output as LexicalTextEditsResponse
}

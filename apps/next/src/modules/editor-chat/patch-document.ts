import type { LanguageModel } from 'ai'
import { generateText, Output } from 'ai'

import {
  extractTextNodesFromLexicalState,
  lexicalTextEditsResponseSchema,
  setAtPath,
} from './lexicalTextEdits'

/**
 * System prompt for PATCH mode: editing existing text nodes while preserving structure.
 */
const buildPatchSystemPrompt = () => {
  return [
    'You are editing a Lexical rich text document by updating text-node strings.',
    'You will receive an array of text nodes with numeric IDs and their current text.',
    '',
    'RULES:',
    '- Return EXACTLY one edit per input node ID (same count, same order).',
    '- Do not add, remove, or reorder IDs.',
    '- Update the text field for each node according to the user instruction.',
    '',
    'HANDLING EXISTING CONTENT:',
    '- Preserve the structure: do not merge or split text across nodes.',
    '- Apply the instruction (translate, rephrase, etc.) to each node independently.',
    '- If a node is empty in the input, keep it empty unless the instruction explicitly requires filling it.',
  ].join('\n')
}

/**
 * User prompt for PATCH mode.
 */
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

export interface PatchDocumentOptions {
  model: LanguageModel
  prompt: string
  editorState: any
}

export interface PatchDocumentResult {
  success: true
  editor: any
  message: string
}

export interface PatchDocumentError {
  success: false
  message: string
  errors: Record<string, string[]>
}

/**
 * Patches an existing Lexical document by extracting text nodes,
 * sending them to an AI model for editing, and applying the edits
 * back to the original document structure.
 *
 * This preserves all formatting (headings, lists, bold, italic, etc.)
 * while only modifying the text content.
 */
export async function patchDocument(
  options: PatchDocumentOptions
): Promise<PatchDocumentResult | PatchDocumentError> {
  const { model, prompt, editorState } = options

  const extracted = extractTextNodesFromLexicalState(editorState)
  const inputTextNodes = extracted.map(({ id, text }) => ({ id, text }))

  if (inputTextNodes.length === 0) {
    return {
      success: false,
      message: 'No text nodes found to edit.',
      errors: { editor: ['No text nodes found to edit.'] },
    }
  }

  // Simple guardrail for prototype: avoid accidental huge prompts.
  if (inputTextNodes.length > 400) {
    return {
      success: false,
      message: 'Document too large for the current prototype (too many text nodes).',
      errors: { editor: ['Document too large for the current prototype.'] },
    }
  }

  const result = await generateText({
    model,
    system: buildPatchSystemPrompt(),
    prompt: buildPatchUserPrompt(prompt, inputTextNodes),
    output: Output.object({
      schema: lexicalTextEditsResponseSchema,
    }),
  })

  const edits = result.output.edits

  if (edits.length !== extracted.length) {
    return {
      success: false,
      message: 'AI returned an unexpected number of edits.',
      errors: {},
    }
  }

  const expectedIds = new Set(extracted.map((n) => n.id))
  for (const edit of edits) {
    if (!expectedIds.has(edit.id)) {
      return {
        success: false,
        message: 'AI returned edits with unexpected ids.',
        errors: {},
      }
    }
  }

  // Apply edits to the editor state (mutates editorState)
  for (const edit of edits) {
    const node = extracted[edit.id]
    if (!node) continue
    try {
      setAtPath(editorState, node.path, edit.text)
    } catch {
      // Ignore invalid paths; schema validation can be added later.
    }
  }

  return {
    success: true,
    editor: editorState,
    message: 'Task completed successfully via AI instruction (patch mode).',
  }
}

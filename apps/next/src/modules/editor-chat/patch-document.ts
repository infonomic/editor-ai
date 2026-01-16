import { getPatchDoc as getPatchAnthropicDoc } from '@/ai/models/anthropic/patch'
import { getPatchDoc as getPatchGeminiDoc } from '@/ai/models/google/patch'
import { getPatchDoc as getPatchOpenAIDoc } from '@/ai/models/openai/patch'
import { extractTextNodesFromLexicalState, setAtPath } from './lexical-text-edits'
import type { ChatApi, Provider } from './@types'

export interface PatchDocumentOptions {
  provider: Provider
  apiKey: string
  modelName: string
  prompt: string
  api: ChatApi
  editorState: any
  signal?: AbortSignal
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
  const { provider, apiKey, modelName, prompt, api, editorState, signal } = options

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

  const result =
    provider === 'openai'
      ? await getPatchOpenAIDoc(api)({
          apiKey,
          model: modelName,
          prompt,
          textNodes: inputTextNodes,
          signal,
        })
      : provider === 'google'
        ? await getPatchGeminiDoc(api)({
            apiKey,
            model: modelName,
            prompt,
            textNodes: inputTextNodes,
            signal,
          })
        : await getPatchAnthropicDoc(api)({
            apiKey,
            model: modelName,
            prompt,
            textNodes: inputTextNodes,
            signal,
          })

  const edits = result.edits

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

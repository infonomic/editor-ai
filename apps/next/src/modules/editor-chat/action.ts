'use server'

import OpenAI from 'openai'
import { stdSerializers } from 'pino'
import { z } from 'zod'

import { getServerConfig } from '@/config'
import { getLogger } from '@/lib/logger'
import { type InstructionState, instructionSchema } from './@types'
import {
  extractTextNodesFromLexicalState,
  lexicalTextEditsResponseSchema,
  safeParseJsonObject,
  setAtPath,
} from './lexicalTextEdits'

const ensureNonEmptyLexicalDocument = (state: any) => {
  if (state == null || typeof state !== 'object') return
  if (state.root == null || typeof state.root !== 'object') {
    state.root = {
      children: [],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    }
  }

  if (Array.isArray(state.root.children) && state.root.children.length === 0) {
    state.root.children = [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: '',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ]
  }
}

const buildSystemPrompt = () => {
  return [
    'You are editing a Lexical rich text document by updating ONLY text-node strings.',
    'Return ONLY valid JSON (no markdown, no code fences, no prose).',
    'JSON shape must be: {"edits":[{"id":0,"text":"..."}]}',
    'Rules:',
    '- You will be given an array of input text nodes with numeric ids and their current text.',
    '- Return EXACTLY one edit per input node id (same count).',
    '- Do not add or remove ids.',
    '- Keep whitespace reasonable; do not include surrounding quotes.',
  ].join('\n')
}

const buildUserPrompt = (instruction: string, textNodes: Array<{ id: number; text: string }>) => {
  return [
    `INSTRUCTION: ${instruction}`,
    '',
    'INPUT_TEXT_NODES_JSON:',
    JSON.stringify(textNodes),
  ].join('\n')
}

export async function executeInstruction(
  _prevState: InstructionState,
  formData: FormData
): Promise<InstructionState> {
  const config = getServerConfig()
  const logger = getLogger()

  const validatedFields = instructionSchema.safeParse({
    prompt: formData.get('prompt'),
    editor: formData.get('editor'),
  })

  // If form validation fails, return errors early. Otherwise, continue...
  if (validatedFields.success === false) {
    return {
      errors: z.flattenError(validatedFields.error).fieldErrors,
      message: 'Missing fields in instruction form.',
      status: 'failed',
    }
  }

  // Prepare data for next step, insertion into the database or other...
  const { prompt, editor } = validatedFields.data

  try {
    const apiKey = config.ai.openai.apiKey
    if (apiKey == null || apiKey.length === 0) {
      return {
        errors: { prompt: [], editor: [] },
        message: 'OpenAI API key is missing on the server.',
        status: 'failed',
      }
    }

    let editorState: any
    try {
      editorState = JSON.parse(editor)
    } catch {
      return {
        errors: { editor: ['Editor state must be valid JSON.'] },
        message: 'Editor state is invalid JSON.',
        status: 'failed',
      }
    }

    ensureNonEmptyLexicalDocument(editorState)

    const extracted = extractTextNodesFromLexicalState(editorState)
    const inputTextNodes = extracted.map(({ id, text }) => ({ id, text }))

    if (inputTextNodes.length === 0) {
      return {
        errors: { editor: ['No text nodes found to edit.'] },
        message: 'No text nodes found to edit.',
        status: 'failed',
      }
    }

    // Simple guardrail for prototype: avoid accidental huge prompts.
    if (inputTextNodes.length > 400) {
      return {
        errors: { editor: ['Document too large for the current prototype.'] },
        message: 'Document too large for the current prototype (too many text nodes).',
        status: 'failed',
      }
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: config.ai.openai.baseUrl,
    })

    const model = 'gpt-4o-mini'
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(prompt, inputTextNodes) },
      ],
    })

    const content = completion.choices?.[0]?.message?.content
    if (!content) {
      return {
        errors: {},
        message: 'AI returned an empty response.',
        status: 'failed',
      }
    }

    let parsed: unknown
    try {
      parsed = safeParseJsonObject(content)
    } catch {
      return {
        errors: {},
        message: 'AI response was not valid JSON.',
        status: 'failed',
      }
    }

    const validated = lexicalTextEditsResponseSchema.safeParse(parsed)
    if (validated.success === false) {
      return {
        errors: { prompt: [], editor: [] },
        message: 'AI returned an invalid JSON payload.',
        status: 'failed',
      }
    }

    const edits = validated.data.edits
    if (edits.length !== extracted.length) {
      return {
        errors: {},
        message: 'AI returned an unexpected number of edits.',
        status: 'failed',
      }
    }

    const expectedIds = new Set(extracted.map((n) => n.id))
    for (const edit of edits) {
      if (!expectedIds.has(edit.id)) {
        return {
          errors: {},
          message: 'AI returned edits with unexpected ids.',
          status: 'failed',
        }
      }
    }

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
      errors: {},
      message: 'Task completed successfully via AI instruction.',
      editor: editorState,
      status: 'success',
    }
  } catch (error) {
    logger.error({
      contact: {
        status: 'failed',
        message: 'error calling instruction action',
        method: 'instruction',
        error: stdSerializers.err(error as Error),
      },
    })

    return {
      errors: {},
      message: 'Failed to complete AI instruction.',
      status: 'failed',
    }
  }
}

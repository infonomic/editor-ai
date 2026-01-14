import type { LanguageModel } from 'ai'
import { generateText, jsonSchema, Output } from 'ai'
import Ajv from 'ajv'

import { documentSchema } from '@/ai/schemas/lexicalJsonSchema'

const ajv = new Ajv({ allErrors: true, strict: false })
const validateLexicalDocument = ajv.compile(documentSchema as any)

/**
 * System prompt for GENERATE mode: creating a new Lexical document from scratch.
 */
const buildGenerateSystemPrompt = () => {
  return [
    'You are generating a Lexical rich text document based on a user prompt.',
    'Generate a complete, well-structured document with appropriate formatting.',
    '',
    'CONTENT GUIDELINES:',
    '- Use headings (h1, h2, h3) to structure the content appropriately.',
    '- Use paragraphs for body text.',
    '- Use lists (bullet or numbered) when presenting multiple items.',
    '- Use quotes for citations or emphasized text blocks.',
    '- Use bold/italic formatting (via text node format property) for emphasis.',
    '',
    'STRUCTURE RULES:',
    '- The root node must contain an array of block-level children.',
    '- Each block (paragraph, heading, list, quote) must contain text nodes or other inline elements.',
    '- Text nodes must include all required properties: type, text, format, style, mode, detail, direction, indent, version.',
    '- Default values: format=0, style="", mode=0, detail=0, direction="ltr", indent=0, version=1.',
    '',
    'FORMAT FLAGS (for text nodes):',
    '- 0 = No format',
    '- 1 = Bold',
    '- 2 = Italic',
    '- 3 = Bold + Italic',
    '- 8 = Underline',
    '',
    'JSON STRUCTURE EXAMPLE:',
    '{',
    '  "root": {',
    '    "type": "root",',
    '    "format": "",',
    '    "indent": 0,',
    '    "version": 1,',
    '    "direction": "ltr",',
    '    "children": [',
    '      {',
    '        "type": "heading",',
    '        "tag": "h1",',
    '        "format": "",',
    '        "indent": 0,',
    '        "version": 1,',
    '        "direction": "ltr",',
    '        "children": [',
    '          {',
    '            "type": "text",',
    '            "text": "Hello World",',
    '            "format": 0,',
    '            "style": "",',
    '            "mode": 0,',
    '            "detail": 0,',
    '            "direction": "ltr",',
    '            "indent": 0,',
    '            "version": 1',
    '          }',
    '        ]',
    '      },',
    '      {',
    '        "type": "paragraph",',
    '        "format": "",',
    '        "indent": 0,',
    '        "version": 1,',
    '        "direction": "ltr",',
    '        "children": [...]',
    '      }',
    '    ]',
    '  }',
    '}',
    '',
    'IMPORTANT:',
    '- Do NOT return a list of strings (e.g. ["h1", "paragraph"]) for children.',
    '- You MUST return the full object structure for every node.',
    '',
    'Generate a complete, valid Lexical document that fulfills the user request.',
  ].join('\n')
}

/**
 * User prompt for GENERATE mode.
 */
const buildGenerateUserPrompt = (instruction: string) => {
  return `Generate a Lexical document based on the following request:\n\n${instruction}`
}

const buildGenerateHtmlSystemPrompt = () => {
  return [
    'You are writing HTML for a rich text editor.',
    'Return ONLY valid HTML (no Markdown, no code fences).',
    'Use semantic tags: h1/h2/h3, p, ul/ol/li, blockquote, strong, em.',
    'Do not include <html>, <head>, or <body> wrappers.',
  ].join('\n')
}

const buildGenerateHtmlUserPrompt = (instruction: string) => {
  return `Write HTML for the following request:\n\n${instruction}`
}

export interface GenerateDocumentOptions {
  model: LanguageModel
  prompt: string
}

export type GenerateDocumentResult =
  | {
      success: true
      format: 'lexical'
      editor: any
      message: string
    }
  | {
      success: true
      format: 'html'
      html: string
      message: string
    }

export interface GenerateDocumentError {
  success: false
  message: string
  errors: Record<string, string[]>
}

/**
 * Generates a new Lexical document from scratch based on a user prompt.
 * Uses the documentSchema to ensure the AI generates valid Lexical JSON
 * with proper structure including headings, paragraphs, lists, etc.
 */
export async function generateDocument(
  options: GenerateDocumentOptions
): Promise<GenerateDocumentResult | GenerateDocumentError> {
  const { model, prompt } = options

  // Use the documentSchema with jsonSchema() for structured output
  const lexicalSchema = jsonSchema<{ root: any }>({
    ...documentSchema,
    // Remove $schema property as it's not needed for AI SDK
    $schema: undefined,
  } as any)

  const result = await generateText({
    model,
    system: buildGenerateSystemPrompt(),
    prompt: buildGenerateUserPrompt(prompt),
    output: Output.object({
      schema: lexicalSchema,
    }),
  })

  const generatedDocument = result.output

  const isValid = validateLexicalDocument(generatedDocument)
  if (isValid) {
    return {
      success: true,
      format: 'lexical',
      editor: generatedDocument,
      message: 'Task completed successfully via AI instruction (generate mode).',
    }
  }

  // Fallback: generate HTML when the model cannot reliably produce valid Lexical JSON.
  const htmlResult = await generateText({
    model,
    system: buildGenerateHtmlSystemPrompt(),
    prompt: buildGenerateHtmlUserPrompt(prompt),
  })

  const html = htmlResult.text?.trim() ?? ''
  if (html.length > 0) {
    return {
      success: true,
      format: 'html',
      html,
      message: 'Generated HTML fallback (Lexical JSON validation failed).',
    }
  }

  const validationErrors = (validateLexicalDocument.errors ?? []).map((e) => {
    const instancePath = e.instancePath ? ` at ${e.instancePath}` : ''
    const message = e.message ?? 'Schema validation error'
    return `${message}${instancePath}`
  })

  return {
    success: false,
    message: 'AI failed to generate a valid Lexical document (and HTML fallback was empty).',
    errors: {
      editor: validationErrors,
    },
  }
}

import type { LanguageModel } from 'ai'
import { generateText, jsonSchema, Output } from 'ai'

import { documentSchema } from '@/ai/schemas/lexicalJsonSchema'

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
    'Generate a complete, valid Lexical document that fulfills the user request.',
  ].join('\n')
}

/**
 * User prompt for GENERATE mode.
 */
const buildGenerateUserPrompt = (instruction: string) => {
  return `Generate a Lexical document based on the following request:\n\n${instruction}`
}

export interface GenerateDocumentOptions {
  model: LanguageModel
  prompt: string
}

export interface GenerateDocumentResult {
  success: true
  editor: any
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

  // Validate the generated document has a root
  if (!generatedDocument || !generatedDocument.root) {
    return {
      success: false,
      message: 'AI failed to generate a valid Lexical document structure.',
      errors: {},
    }
  }

  return {
    success: true,
    editor: generatedDocument,
    message: 'Task completed successfully via AI instruction (generate mode).',
  }
}

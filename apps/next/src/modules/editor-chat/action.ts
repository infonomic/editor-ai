'use server'

import { hasText } from '@infonomic/editor'
import { stdSerializers } from 'pino'
import { z } from 'zod'

import { getServerConfig } from '@/config'
import { getLogger } from '@/lib/logger'
import { type InstructionState, instructionSchema } from './@types'
import { generateDocument } from './generate-document'
import { patchDocument } from './patch-document'

export async function executeInstruction(
  _prevState: InstructionState,
  formData: FormData
): Promise<InstructionState> {
  const config = getServerConfig()
  const logger = getLogger()

  const validatedFields = instructionSchema.safeParse({
    prompt: formData.get('prompt'),
    editor: formData.get('editor'),
    api: formData.get('api'),
    provider: formData.get('provider'),
    model: formData.get('model'),
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
  const { prompt, editor, provider, model: modelName, api } = validatedFields.data

  try {
    // Validate that the appropriate API key exists for the selected provider
    let apiKey: string | undefined
    switch (provider) {
      case 'openai':
        apiKey = config.ai.openai.apiKey
        break
      case 'google':
        apiKey = config.ai.google.apiKey
        break
      case 'anthropic':
        apiKey = config.ai.anthropic.apiKey
        break
    }

    if (apiKey == null || apiKey.length === 0) {
      return {
        errors: { prompt: [], editor: [] },
        message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is missing on the server.`,
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

    // Use hasText to determine if we have existing content to edit (PATCH mode)
    // or if we need to generate a new document (GENERATE mode)
    const documentHasContent = hasText(editorState)

    if (documentHasContent) {
      // PATCH MODE: Edit existing text nodes while preserving document structure
      const result = await patchDocument({
        provider,
        apiKey,
        modelName,
        prompt,
        api,
        editorState,
      })

      if (result.success) {
        return {
          errors: {},
          message: result.message,
          editor: result.editor,
          format: 'lexical',
          status: 'success',
        }
      } else {
        return {
          errors: result.errors,
          message: result.message,
          status: 'failed',
        }
      }
    } else {
      // GENERATE MODE: Create a new Lexical document from scratch
      const result = await generateDocument({
        provider,
        apiKey,
        modelName,
        prompt,
        api,
      })

      console.log('generateDocument result:', JSON.stringify(result))

      if (result.success) {
        if (result.format === 'html') {
          return {
            errors: {},
            message: result.message,
            format: 'html',
            html: result.html,
            status: 'success',
          }
        }

        return {
          errors: {},
          message: result.message,
          format: 'lexical',
          editor: result.editor,
          status: 'success',
        }
      }

      return {
        errors: result.errors,
        message: result.message,
        status: 'failed',
      }
    }
  } catch (error) {
    logger.error({
      instruction: {
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

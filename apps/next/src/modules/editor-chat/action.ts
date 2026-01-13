'use server'

import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { hasText } from '@infonomic/editor'
import { stdSerializers } from 'pino'
import { z } from 'zod'

import { getServerConfig } from '@/config'
import { getLogger } from '@/lib/logger'
import { type InstructionState, instructionSchema } from './@types'
import { generateDocument } from './generate-document'
import { patchDocument } from './patch-document'

/**
 * Get the appropriate model instance based on provider name.
 */
const getModelInstance = (providerName: string, modelName: string) => {
  switch (providerName) {
    case 'google':
      return google(modelName)
    case 'anthropic':
      return anthropic(modelName)
    case 'openai':
    default:
      return openai(modelName)
  }
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
  const { prompt, editor, provider, model: modelName } = validatedFields.data

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

    console.log('Editor State:', editorState)

    // Use hasText to determine if we have existing content to edit (PATCH mode)
    // or if we need to generate a new document (GENERATE mode)
    const documentHasContent = hasText(editorState)
    const model = getModelInstance(provider, modelName)

    if (documentHasContent) {
      // PATCH MODE: Edit existing text nodes while preserving document structure
      const result = await patchDocument({
        model,
        prompt,
        editorState,
      })

      if (result.success) {
        return {
          errors: {},
          message: result.message,
          editor: result.editor,
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
        model,
        prompt,
      })

      if (result.success) {
        return {
          errors: {},
          message: result.message,
          editor: result.editor,
          status: 'success',
        }
      } else {
        return {
          errors: result.errors,
          message: result.message,
          status: 'failed',
        }
      }
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

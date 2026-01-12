'use server'

import { stdSerializers } from 'pino'
import { z } from 'zod'

import { getServerConfig } from '@/config'
import { getLogger } from '@/lib/logger'
import { type InstructionState, instructionSchema } from './@types'

export async function instruction(
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

  // Try sending the email
  try {
    const apiKey = config.ai[config.ai.defaultProvider].apiKey
    //
    // TODO: Implement AI API instruction here
    //
    const aiGeneratedContent = 'foo'
    const instructionResult = 'success'

    if (instructionResult === 'success') {
      return {
        errors: {},
        message: 'Task completed successfully via AI instruction.',
        editor: aiGeneratedContent,
        status: 'success',
      }
    }
    return {
      errors: {},
      message: 'Failed to complete AI instruction.',
      status: 'failed',
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

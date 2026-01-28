import { stdSerializers } from 'pino'
import { z } from 'zod'

import { type ExecuteInstructionFields, type InstructionState, instructionSchema } from './@types'
import { getAiServerConfig } from './config/ai-config'
import { generateStreaming } from './generate'
import { getLogger } from './lib/logger'
import { patchStreaming } from './patch'
import { hasText } from './utils/has-text'

const isAbortLikeError = (error: unknown): boolean => {
  if (error == null) return false

  // Many libraries throw DOM-style AbortError
  const anyErr = error as any
  if (anyErr?.name === 'AbortError') return true

  // OpenAI Node SDK (responses/streaming + undici) can throw these.
  if (anyErr?.type === 'APIUserAbortError') return true

  // Undici abort error (often surfaces as name ResponseAborted)
  if (anyErr?.name === 'ResponseAborted') return true

  // Some libs only set message text.
  const message = typeof anyErr?.message === 'string' ? anyErr.message : ''
  if (message.toLowerCase().includes('aborted')) return true

  return false
}

export type ExecuteInstructionStreamingResult = {
  text: AsyncIterable<string>
  final: Promise<InstructionState>
}

const createEmptyTextStream = (): AsyncIterable<string> =>
  (async function* () {
    // intentionally empty
  })()

export function executeInstructionStreaming(
  fields: ExecuteInstructionFields,
  options?: { signal?: AbortSignal }
): ExecuteInstructionStreamingResult {
  const startedAt = Date.now()
  const withLastRun = (state: InstructionState): InstructionState => {
    return { ...state, lastRun: Date.now() - startedAt }
  }

  const config = getAiServerConfig()
  const logger = getLogger()

  const validatedFields = instructionSchema.safeParse(fields)

  if (validatedFields.success === false) {
    return {
      text: createEmptyTextStream(),
      final: Promise.resolve(
        withLastRun({
          errors: z.flattenError(validatedFields.error).fieldErrors,
          message: 'Missing fields in instruction form.',
          status: 'failed',
        })
      ),
    }
  }

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
        text: createEmptyTextStream(),
        final: Promise.resolve(
          withLastRun({
            errors: { prompt: [], editor: [] },
            message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is missing on the server.`,
            status: 'failed',
          })
        ),
      }
    }

    let editorState: any
    try {
      editorState = JSON.parse(editor)
    } catch {
      return {
        text: createEmptyTextStream(),
        final: Promise.resolve(
          withLastRun({
            errors: { editor: ['Editor state must be valid JSON.'] },
            message: 'Editor state is invalid JSON.',
            status: 'failed',
          })
        ),
      }
    }

    const documentHasContent = hasText(editorState)
    // console.log(`Execute instruction streaming hasText: ${documentHasContent}`)

    const streamResult = documentHasContent
      ? patchStreaming({
          provider,
          apiKey,
          modelName,
          prompt,
          api,
          editorState,
          signal: options?.signal,
        })
      : generateStreaming({
          provider,
          apiKey,
          modelName,
          prompt,
          api,
          signal: options?.signal,
        })

    const final = (async (): Promise<InstructionState> => {
      try {
        const result = await streamResult.final

        if (result.success) {
          if ('format' in result && result.format === 'html') {
            return withLastRun({
              errors: {},
              message: result.message,
              format: 'html',
              html: result.html,
              status: 'success',
            })
          }

          return withLastRun({
            errors: {},
            message: result.message,
            format: 'lexical',
            editor: result.editor,
            status: 'success',
          })
        }

        return withLastRun({
          errors: result.errors,
          message: result.message,
          status: 'failed',
        })
      } catch (error) {
        if (isAbortLikeError(error)) {
          return withLastRun({
            errors: {},
            message: 'Cancelled.',
            status: 'idle',
          })
        }

        logger.error({
          instruction: {
            status: 'failed',
            message: 'error calling instruction action',
            method: 'instruction-streaming',
            error: stdSerializers.err(error as Error),
          },
        })

        return withLastRun({
          errors: {},
          message: 'Failed to complete AI instruction.',
          status: 'failed',
        })
      }
    })()

    return { text: streamResult.text, final }
  } catch (error) {
    if (isAbortLikeError(error)) {
      return {
        text: createEmptyTextStream(),
        final: Promise.resolve(
          withLastRun({
            errors: {},
            message: 'Cancelled.',
            status: 'idle',
          })
        ),
      }
    }

    logger.error({
      instruction: {
        status: 'failed',
        message: 'error calling instruction action',
        method: 'instruction-streaming',
        error: stdSerializers.err(error as Error),
      },
    })

    return {
      text: createEmptyTextStream(),
      final: Promise.resolve(
        withLastRun({
          errors: {},
          message: 'Failed to complete AI instruction.',
          status: 'failed',
        })
      ),
    }
  }
}

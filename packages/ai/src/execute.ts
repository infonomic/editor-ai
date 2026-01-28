import { stdSerializers } from 'pino'
import { z } from 'zod'

import { instructionSchema } from './@types'
import { getAiServerConfig } from './config/ai-config'
import {
  type GenerateStreamingResult,
  generateHtml,
  generateHtmlStreaming,
  generateStructured,
  generateStructuredStreaming,
  generateText,
  generateTextStreaming,
} from './generate'
import { getLogger } from './lib/logger'
import { type PatchStreamingResult, patch, patchStreaming } from './patch'
import { hasText } from './utils/has-text'
import type {
  ExecuteInstructionOptions,
  ExecuteInstructionParams,
  InstructionApi,
  InstructionState,
  OutputPreference,
  Provider,
} from './@types'

type ValidatedInstruction = {
  api: InstructionApi
  apiKey: string
  editorState: any
  modelName: string
  prompt: string
  provider: Provider
  output: OutputPreference
}

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

const createEmptyTextStream = (): AsyncIterable<string> =>
  (async function* () {
    // intentionally empty
  })()

const validateInstructionFields = (
  fields: ExecuteInstructionParams
): { ok: true; data: ValidatedInstruction } | { ok: false; errorState: InstructionState } => {
  const config = getAiServerConfig()
  const validatedFields = instructionSchema.safeParse(fields)

  if (validatedFields.success === false) {
    return {
      ok: false,
      errorState: {
        errors: z.flattenError(validatedFields.error).fieldErrors,
        message: 'Missing fields in instruction form.',
        status: 'failed',
      },
    }
  }

  const { prompt, editor, provider, model: modelName, api } = validatedFields.data
  const output = validatedFields.data.output ?? ({ type: 'structured' } as const)

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
      ok: false,
      errorState: {
        errors: { prompt: [], editor: [] },
        message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is missing on the server.`,
        status: 'failed',
      },
    }
  }

  let editorState: any
  try {
    editorState = JSON.parse(editor)
  } catch {
    return {
      ok: false,
      errorState: {
        errors: { editor: ['Editor state must be valid JSON.'] },
        message: 'Editor state is invalid JSON.',
        status: 'failed',
      },
    }
  }

  return {
    ok: true,
    data: {
      api,
      apiKey,
      editorState,
      modelName,
      prompt,
      provider,
      output,
    },
  }
}

export async function executeInstruction(
  params: ExecuteInstructionParams,
  options?: ExecuteInstructionOptions
): Promise<InstructionState> {
  const startedAt = Date.now()

  const withLastRun = (state: InstructionState): InstructionState => {
    console.log('executeInstruction result', state)
    return { ...state, lastRun: Date.now() - startedAt }
  }

  const logger = getLogger()
  const validated = validateInstructionFields(params)

  if (validated.ok === false) {
    return withLastRun(validated.errorState)
  }

  const { prompt, editorState, provider, modelName, api, apiKey, output } = validated.data

  try {
    if (output.type === 'html') {
      const result = await generateHtml({
        provider,
        apiKey,
        modelName,
        prompt,
        api,
        signal: options?.signal,
      })

      if (result.success) {
        return withLastRun({
          errors: {},
          message: result.message,
          format: 'html',
          html: result.html,
          status: 'success',
        })
      }

      return withLastRun({
        errors: result.errors,
        message: result.message,
        status: 'failed',
      })
    }

    if (output.type === 'text') {
      const result = await generateText({
        provider,
        apiKey,
        modelName,
        prompt,
        api,
        maxLength: output.maxLength,
        signal: options?.signal,
      })

      if (result.success) {
        return withLastRun({
          errors: {},
          message: result.message,
          format: 'text',
          text: result.text,
          status: 'success',
        })
      }

      return withLastRun({
        errors: result.errors,
        message: result.message,
        status: 'failed',
      })
    }

    // output.type === 'structured'
    const documentHasContent = hasText(editorState)
    // console.log(`Execute instruction hasText: ${documentHasContent}`)

    if (documentHasContent) {
      const result = await patch({
        provider,
        apiKey,
        modelName,
        prompt,
        api,
        editorState,
        signal: options?.signal,
      })

      if (result.success) {
        return withLastRun({
          errors: {},
          message: result.message,
          editor: result.editor,
          format: 'lexical',
          status: 'success',
        })
      }

      return withLastRun({
        errors: result.errors,
        message: result.message,
        status: 'failed',
      })
    }

    const result = await generateStructured({
      provider,
      apiKey,
      modelName,
      prompt,
      api,
      signal: options?.signal,
    })

    if (result.success) {
      switch (result.format) {
        case 'html':
          return withLastRun({
            errors: {},
            message: result.message,
            format: 'html',
            html: result.html,
            status: 'success',
          })
        case 'text':
          return withLastRun({
            errors: {},
            message: result.message,
            format: 'text',
            text: result.text,
            status: 'success',
          })
        case 'lexical':
          return withLastRun({
            errors: {},
            message: result.message,
            format: 'lexical',
            editor: result.editor,
            status: 'success',
          })
      }
    }

    return withLastRun({
      errors: result.errors,
      message: result.message,
      status: 'failed',
    })
  } catch (error) {
    // Cancellation is expected behavior; do not log at error level.
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
        method: 'instruction',
        error: stdSerializers.err(error as Error),
      },
    })

    return withLastRun({
      errors: {},
      message: 'Failed to complete AI instruction.',
      status: 'failed',
    })
  }
}

export type ExecuteInstructionStreamingResult = {
  text: AsyncIterable<string>
  final: Promise<InstructionState>
}

export function executeInstructionStreaming(
  params: ExecuteInstructionParams,
  options?: ExecuteInstructionOptions
): ExecuteInstructionStreamingResult {
  const startedAt = Date.now()
  const withLastRun = (state: InstructionState): InstructionState => {
    return { ...state, lastRun: Date.now() - startedAt }
  }

  const logger = getLogger()
  const validated = validateInstructionFields(params)

  if (validated.ok === false) {
    return {
      text: createEmptyTextStream(),
      final: Promise.resolve(withLastRun(validated.errorState)),
    }
  }

  const { prompt, editorState, provider, modelName, api, apiKey, output } = validated.data

  try {
    let streamResult: GenerateStreamingResult | PatchStreamingResult

    if (output.type === 'html') {
      streamResult = generateHtmlStreaming({
        provider,
        apiKey,
        modelName,
        prompt,
        api,
        signal: options?.signal,
      })
    } else if (output.type === 'text') {
      streamResult = generateTextStreaming({
        provider,
        apiKey,
        modelName,
        prompt,
        api,
        maxLength: output.maxLength,
        signal: options?.signal,
      })
    } else {
      const documentHasContent = hasText(editorState)
      // console.log(`Execute instruction streaming hasText: ${documentHasContent}`)
      streamResult = documentHasContent
        ? patchStreaming({
            provider,
            apiKey,
            modelName,
            prompt,
            api,
            editorState,
            signal: options?.signal,
          })
        : generateStructuredStreaming({
            provider,
            apiKey,
            modelName,
            prompt,
            api,
            signal: options?.signal,
          })
    }

    const final = (async (): Promise<InstructionState> => {
      try {
        const result = await streamResult.final

        if (result.success) {
          if ('format' in result) {
            switch (result.format) {
              case 'html':
                return withLastRun({
                  errors: {},
                  message: result.message,
                  format: 'html',
                  html: result.html,
                  status: 'success',
                })
              case 'text':
                return withLastRun({
                  errors: {},
                  message: result.message,
                  format: 'text',
                  text: result.text,
                  status: 'success',
                })
              case 'lexical':
                return withLastRun({
                  errors: {},
                  message: result.message,
                  format: 'lexical',
                  editor: result.editor,
                  status: 'success',
                })
            }
          }

          // Patch success (structured patch) returns an editor.
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

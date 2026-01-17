import { beforeEach, describe, expect, it } from 'vitest'

import { getServerConfig } from '../../../config'
import {
  generateDoc as generateDocNative,
  generateDocStreaming as generateDocStreamingNative,
} from './generate-native'
import {
  generateDocStreaming as generateDocStreamingVercel,
  generateDoc as generateDocVercel,
} from './generate-vercel'

const MODEL = 'gemini-2.5-flash'

describe('google generate', () => {
  beforeEach(async () => {})

  const runReal = true // = process.env.AI_RUN_REAL_TESTS === 'true'

  if (runReal) {
    /***
     * Generates a document from Google using structured outputs.
     */
    it('makes a real Google request (manual run) from native provider', async () => {
      const config = getServerConfig()
      if (!config.ai.google.apiKey) {
        throw new Error('GOOGLE_API_KEY is required for real Google tests.')
      }

      const result = await generateDocNative({
        apiKey: config.ai.google.apiKey,
        model: MODEL,
        prompt: 'Create a haiku poem about a child by the sea.',
      })

      console.log('RESULT (Google Native):', result)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('object')
    }, 30000)

    /***
     * Generates a document from Google using structured outputs via streaming.
     */
    it.skip('streams a real Google response (manual run) from native provider', async () => {
      const config = getServerConfig()
      if (!config.ai.google.apiKey) {
        throw new Error('GOOGLE_API_KEY is required for real Google tests.')
      }

      const streamResult = generateDocStreamingNative({
        apiKey: config.ai.google.apiKey,
        model: MODEL,
        prompt: 'Create a haiku poem about a child by the sea.',
      })

      let streamedText = ''
      for await (const chunk of streamResult.text) {
        streamedText += chunk
        console.log('STREAM CHUNK (Google Native):', chunk)
      }

      const final = await streamResult.final
      console.log('FINAL RESULT (Google Native):', final)

      expect(streamedText.length).toBeGreaterThanOrEqual(0)
      expect(final).toBeTruthy()
      expect(typeof final).toBe('object')
    }, 30000)

    /***
     * Generates a document from Google using structured outputs.
     */
    it('makes a real Google request (manual run) from vercel provider', async () => {
      const config = getServerConfig()
      if (!config.ai.google.apiKey) {
        throw new Error('GOOGLE_API_KEY is required for real Google tests.')
      }

      const result = await generateDocVercel({
        apiKey: config.ai.google.apiKey,
        model: MODEL,
        prompt: 'Create a haiku poem about a child by the sea.',
      })

      console.log('RESULT (Google Vercel):', result)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('object')
    }, 30000)

    /***
     * Generates a document from Google using structured outputs via streaming.
     */
    it.skip('streams a real Google response (manual run) from vercel provider', async () => {
      const config = getServerConfig()
      if (!config.ai.google.apiKey) {
        throw new Error('GOOGLE_API_KEY is required for real Google tests.')
      }

      const streamResult = generateDocStreamingVercel({
        apiKey: config.ai.google.apiKey,
        model: MODEL,
        prompt: 'Create a haiku poem about a child by the sea.',
      })

      let streamedText = ''
      for await (const chunk of streamResult.text) {
        streamedText += chunk
        console.log('STREAM CHUNK (Google Vercel):', chunk)
      }

      const final = await streamResult.final
      console.log('FINAL RESULT (Google Vercel):', final)
      expect(streamedText.length).toBeGreaterThanOrEqual(0)
      expect(final).toBeTruthy()
      expect(typeof final).toBe('object')
    }, 30000)
  } else {
    it.skip('skips real Google tests', () => {
      console.log('Set AI_RUN_REAL_TESTS=true to run real Google tests.')
    })
  }
})

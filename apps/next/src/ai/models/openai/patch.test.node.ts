import { beforeEach, describe, expect, it } from 'vitest'

import { getServerConfig } from '../../../config'
import {
  patchDoc as patchDocNative,
  patchDocStreaming as patchDocStreamingNative,
} from './patch-native'
import {
  patchDocStreaming as patchDocStreamingVercel,
  patchDoc as patchDocVercel,
} from './patch-vercel'

const MODEL = 'gpt-5.2'

describe('openai patch', () => {
  beforeEach(async () => {})

  const runReal = process.env.OPENAI_RUN_REAL_TESTS === 'true'

  if (runReal) {
    /***
     * Generates a document from OpenAI using structured outputs.
     */
    it.skip('makes a real OpenAI request (manual run) from native provider', async () => {
      const config = getServerConfig()
      if (!config.ai.openai.apiKey) {
        throw new Error('OPENAI_API_KEY is required for real OpenAI tests.')
      }

      const result = await patchDocNative({
        apiKey: config.ai.openai.apiKey,
        model: MODEL,
        prompt: 'Translate into French.',
        textNodes: [{ id: 0, text: 'The sun is shining' }],
      })

      console.log(result)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('object')
    }, 30000)

    /***
     * Generates a document from OpenAI using structured outputs via streaming.
     */
    it.skip('streams a real OpenAI response (manual run) from native provider', async () => {
      const config = getServerConfig()
      if (!config.ai.openai.apiKey) {
        throw new Error('OPENAI_API_KEY is required for real OpenAI tests.')
      }

      const streamResult = patchDocStreamingNative({
        apiKey: config.ai.openai.apiKey,
        model: MODEL,
        prompt: 'Translate into French.',
        textNodes: [{ id: 0, text: 'The sun is shining' }],
      })

      let streamedText = ''
      for await (const chunk of streamResult.text) {
        streamedText += chunk
        // console.log('STREAM CHUNK:', chunk)
      }

      const final = await streamResult.final
      console.log('FINAL RESULT:', final)

      expect(streamedText.length).toBeGreaterThanOrEqual(0)
      expect(final).toBeTruthy()
      expect(typeof final).toBe('object')
    }, 30000)

    /***
     * Generates a document from OpenAI using structured outputs.
     */
    it.skip('makes a real OpenAI request (manual run) from vercel provider', async () => {
      const config = getServerConfig()
      if (!config.ai.openai.apiKey) {
        throw new Error('OPENAI_API_KEY is required for real OpenAI tests.')
      }

      const result = await patchDocVercel({
        apiKey: config.ai.openai.apiKey,
        model: MODEL,
        prompt: 'Translate into French.',
        textNodes: [{ id: 0, text: 'The sun is shining' }],
      })

      console.log(result)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('object')
    }, 30000)

    /***
     * Generates a document from OpenAI using structured outputs via streaming.
     */
    it.skip('streams a real OpenAI response (manual run) from vercel provider', async () => {
      const config = getServerConfig()
      if (!config.ai.openai.apiKey) {
        throw new Error('OPENAI_API_KEY is required for real OpenAI tests.')
      }

      const streamResult = patchDocStreamingVercel({
        apiKey: config.ai.openai.apiKey,
        model: MODEL,
        prompt: 'Translate into French.',
        textNodes: [{ id: 0, text: 'The sun is shining' }],
      })

      let streamedText = ''
      for await (const chunk of streamResult.text) {
        streamedText += chunk
        // console.log('STREAM CHUNK:', chunk)
      }

      const final = await streamResult.final
      console.log('FINAL RESULT:', final)

      expect(streamedText.length).toBeGreaterThanOrEqual(0)
      expect(final).toBeTruthy()
      expect(typeof final).toBe('object')
    }, 30000)
  }
})

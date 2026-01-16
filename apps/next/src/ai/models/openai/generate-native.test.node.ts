import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getServerConfig } from '../../../config'
import { generateDoc, generateDocStreaming } from './generate-native'

describe('openai generate-native', () => {
  beforeEach(async () => {})

  const runReal = process.env.OPENAI_RUN_REAL_TESTS === 'true'

  if (runReal) {
    it('makes a real OpenAI request (manual run)', async () => {
      const config = getServerConfig()
      if (!config.ai.openai.apiKey) {
        throw new Error('OPENAI_API_KEY is required for real OpenAI tests.')
      }

      const result = await generateDoc({
        apiKey: config.ai.openai.apiKey,
        model: 'gpt-5',
        prompt: 'Create a poem about a girl by the sea.',
      })

      expect(result).toBeTruthy()
      expect(typeof result).toBe('object')
    }, 30000)

    it('streams a real OpenAI response (manual run)', async () => {
      const config = getServerConfig()
      if (!config.ai.openai.apiKey) {
        throw new Error('OPENAI_API_KEY is required for real OpenAI tests.')
      }

      const streamResult = generateDocStreaming({
        apiKey: config.ai.openai.apiKey,
        model: 'gpt-5',
        prompt: 'Create a poem about a girl by the sea.',
      })

      let streamedText = ''
      for await (const chunk of streamResult.text) {
        streamedText += chunk
      }

      const final = await streamResult.final

      expect(streamedText.length).toBeGreaterThanOrEqual(0)
      expect(final).toBeTruthy()
      expect(typeof final).toBe('object')
    }, 30000)
  } else {
    it.skip('makes a real OpenAI request (set OPENAI_RUN_REAL_TESTS=true)', () => {})
    it.skip('streams a real OpenAI response (set OPENAI_RUN_REAL_TESTS=true)', () => {})
  }
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { patchDoc } from './patch-native'

let mockParse: ReturnType<typeof vi.fn<(...args: any[]) => any>>

vi.mock('openai', () => {
  class OpenAI {
    responses = {
      parse: (...args: any[]) => mockParse(...args),
    }
  }

  return { default: OpenAI }
})

describe('openai patch-native', () => {
  beforeEach(() => {
    mockParse = vi.fn<(...args: any[]) => any>()
  })

  it('returns parsed edits', async () => {
    const parsed = { edits: [{ id: 0, text: 'Updated' }] }
    mockParse.mockResolvedValue({ output_parsed: parsed, output: [] })

    const result = await patchDoc({
      apiKey: 'test-key',
      model: 'gpt-test',
      prompt: 'Update text.',
      textNodes: [{ id: 0, text: 'Original' }],
    })

    expect(result).toEqual(parsed)
  })

  it('throws on refusal', async () => {
    mockParse.mockResolvedValue({
      output_parsed: null,
      output: [
        {
          content: [{ type: 'refusal', refusal: 'nope' }],
        },
      ],
    })

    await expect(
      patchDoc({
        apiKey: 'test-key',
        model: 'gpt-test',
        prompt: 'Update text.',
        textNodes: [{ id: 0, text: 'Original' }],
      })
    ).rejects.toThrow('nope')
  })

  it('passes AbortSignal to the SDK', async () => {
    const parsed = { edits: [{ id: 0, text: 'Updated' }] }
    mockParse.mockResolvedValue({ output_parsed: parsed, output: [] })

    const controller = new AbortController()
    await patchDoc({
      apiKey: 'test-key',
      model: 'gpt-test',
      prompt: 'Update text.',
      textNodes: [{ id: 0, text: 'Original' }],
      signal: controller.signal,
    })

    expect(mockParse).toHaveBeenCalled()
    const [, options] = mockParse.mock.calls[0]
    expect(options).toEqual({ signal: controller.signal })
  })
})

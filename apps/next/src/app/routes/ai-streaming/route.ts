import { executeInstructionStreaming } from '@/modules/editor-chat/execute-instruction-streaming'
import type { InstructionState } from '@/modules/editor-chat/@types'

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    const state: InstructionState = {
      status: 'failed',
      message: 'Request body must be valid JSON.',
      errors: { prompt: [], editor: [] },
      lastRun: null,
    }
    return Response.json(state, { status: 400 })
  }

  // Note: request.signal exists here; we’ll thread it through provider calls next.
  const result = executeInstructionStreaming(
    {
      prompt: body?.prompt,
      editor: body?.editor,
      provider: body?.provider,
      model: body?.model,
      api: body?.api,
    },
    { signal: request.signal }
  )

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const onAbort = () => {
        try {
          controller.close()
        } catch {
          // ignore
        }
      }

      request.signal.addEventListener('abort', onAbort)

      let finalState: InstructionState | null = null
      try {
        for await (const chunk of result.text) {
          const payload = JSON.stringify({ type: 'delta', text: chunk })
          controller.enqueue(encoder.encode(`${payload}\n`))
        }

        finalState = await result.final
        const payload = JSON.stringify({ type: 'final', state: finalState })
        controller.enqueue(encoder.encode(`${payload}\n`))
      } catch {
        if (finalState == null) {
          try {
            finalState = await result.final
          } catch {
            // ignore
          }
        }

        if (finalState) {
          const payload = JSON.stringify({ type: 'final', state: finalState })
          controller.enqueue(encoder.encode(`${payload}\n`))
        } else {
          const payload = JSON.stringify({ type: 'error', message: 'Failed to stream response.' })
          controller.enqueue(encoder.encode(`${payload}\n`))
        }
      } finally {
        request.signal.removeEventListener('abort', onAbort)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

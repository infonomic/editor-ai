import type { ExecuteInstruction, InstructionState } from '@infonomic/ai'
import { executeInstruction, executeInstructionStreaming } from '@infonomic/ai'

export async function POST(request: Request) {
  let body: ExecuteInstruction | undefined
  try {
    body = (await request.json()) as ExecuteInstruction
  } catch {
    const state: InstructionState = {
      status: 'failed',
      message: 'Request body must be valid JSON.',
      errors: { prompt: [], editor: [] },
      lastRun: null,
    }
    return Response.json(state, { status: 400 })
  }

  // IMPORTANT: Pass the request's AbortSignal to the execution functions so
  // that downstream operations can be cancelled if the client disconnects.
  // This helps to save tokens and the cost of our AI SDK usage. Most AI SDK
  // functions support AbortSignal - in particular on streaming calls.
  const options = body?.options
    ? { ...body.options, signal: request.signal }
    : { signal: request.signal }

  const isStreaming = options?.streaming === true

  if (isStreaming) {
    // Stream the response
    const result = executeInstructionStreaming(body.params, options)

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

  // Non-streaming response
  const state = await executeInstruction(body.params, options)

  return Response.json(state)
}

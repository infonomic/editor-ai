import { NextResponse } from 'next/server'

import { executeInstruction } from '@infonomic/ai'

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
    return NextResponse.json(state, { status: 400 })
  }

  // Note: request.signal exists here; we’ll thread it through provider calls next.
  const state = await executeInstruction(
    {
      prompt: body?.prompt,
      editor: body?.editor,
      provider: body?.provider,
      model: body?.model,
      api: body?.api,
    },
    { signal: request.signal }
  )

  return NextResponse.json(state)
}

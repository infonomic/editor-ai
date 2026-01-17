'use server'

import { executeInstruction as executeInstructionInternal } from './execute-instruction'
import type { InstructionState } from './@types'

export async function executeInstruction(
  _prevState: InstructionState,
  formData: FormData
): Promise<InstructionState> {
  return executeInstructionInternal({
    prompt: formData.get('prompt'),
    editor: formData.get('editor'),
    api: formData.get('api'),
    provider: formData.get('provider'),
    model: formData.get('model'),
  })
}

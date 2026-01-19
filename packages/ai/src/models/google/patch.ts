import {
  patchDoc as patchNativeDoc,
  patchDocStreaming as patchNativeDocStreaming,
} from './patch-native'
import {
  patchDoc as patchVercelDoc,
  patchDocStreaming as patchVercelDocStreaming,
} from './patch-vercel'
import type { AiApi } from '@/@types'

export const getPatchDoc = (api: AiApi) => {
  return api === 'vercel' ? patchVercelDoc : patchNativeDoc
}

export const getPatchDocStreaming = (api: AiApi) => {
  return api === 'vercel' ? patchVercelDocStreaming : patchNativeDocStreaming
}

import {
  patchDoc as patchNativeDoc,
  patchDocStreaming as patchNativeDocStreaming,
} from './patch-native'
import {
  patchDoc as patchVercelDoc,
  patchDocStreaming as patchVercelDocStreaming,
} from './patch-vercel'
import type { ChatApi } from '@/modules/editor-chat/@types'

export const getPatchDoc = (api: ChatApi) => {
  return api === 'vercel' ? patchVercelDoc : patchNativeDoc
}

export const getPatchDocStreaming = (api: ChatApi) => {
  return api === 'vercel' ? patchVercelDocStreaming : patchNativeDocStreaming
}

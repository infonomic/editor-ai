import { patchDoc as patchNativeDoc } from './patch-native'
import { patchDoc as patchVercelDoc } from './patch-vercel'
import type { ChatApi } from '@/modules/editor-chat/@types'

export const getPatchDoc = (api: ChatApi) => {
  return api === 'vercel' ? patchVercelDoc : patchNativeDoc
}

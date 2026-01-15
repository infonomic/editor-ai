import { generateDoc as generateNativeDoc } from './generate-native'
import { generateDoc as generateVercelDoc } from './generate-vercel'
import type { ChatApi } from '@/modules/editor-chat/@types'

export const getGenerateDoc = (api: ChatApi) => {
  return api === 'vercel' ? generateVercelDoc : generateNativeDoc
}

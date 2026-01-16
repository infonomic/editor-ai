import {
  generateDoc as generateNativeDoc,
  generateDocStreaming as generateNativeDocStreaming,
} from './generate-native'
import {
  generateDoc as generateVercelDoc,
  generateDocStreaming as generateVercelDocStreaming,
} from './generate-vercel'
import type { ChatApi } from '@/modules/editor-chat/@types'

export const getGenerateDoc = (api: ChatApi) => {
  return api === 'vercel' ? generateVercelDoc : generateNativeDoc
}

export const getGenerateDocStreaming = (api: ChatApi) => {
  return api === 'vercel' ? generateVercelDocStreaming : generateNativeDocStreaming
}

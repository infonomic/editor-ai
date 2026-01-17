import {
  generateDoc as generateNativeDoc,
  generateDocStreaming as generateNativeDocStreaming,
  generateHtml as generateNativeHtml,
} from './generate-native'
import {
  generateDoc as generateVercelDoc,
  generateDocStreaming as generateVercelDocStreaming,
  generateHtml as generateVercelHtml,
} from './generate-vercel'
import type { ChatApi } from '@/modules/editor-chat/@types'

export const getGenerateDoc = (api: ChatApi) => {
  return api === 'vercel' ? generateVercelDoc : generateNativeDoc
}

export const getGenerateDocStreaming = (api: ChatApi) => {
  return api === 'vercel' ? generateVercelDocStreaming : generateNativeDocStreaming
}

export const getGenerateHtml = (api: ChatApi) => {
  return api === 'vercel' ? generateVercelHtml : generateNativeHtml
}

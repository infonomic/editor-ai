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
import type { AiApi } from '@/@types'

export const getGenerateDoc = (api: AiApi) => {
  return api === 'vercel' ? generateVercelDoc : generateNativeDoc
}

export const getGenerateDocStreaming = (api: AiApi) => {
  return api === 'vercel' ? generateVercelDocStreaming : generateNativeDocStreaming
}

export const getGenerateHtml = (api: AiApi) => {
  return api === 'vercel' ? generateVercelHtml : generateNativeHtml
}

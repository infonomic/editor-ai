import {
  generateDoc as generateNativeDoc,
  generateDocStreaming as generateNativeDocStreaming,
  generateHtml as generateNativeHtml,
  generateHtmlStreaming as generateNativeHtmlStreaming,
  generateText as generateNativeText,
  generateTextStreaming as generateNativeTextStreaming,
} from './generate-native'
import {
  generateDoc as generateVercelDoc,
  generateDocStreaming as generateVercelDocStreaming,
  generateHtml as generateVercelHtml,
  generateHtmlStreaming as generateVercelHtmlStreaming,
  generateText as generateVercelText,
  generateTextStreaming as generateVercelTextStreaming,
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

export const getGenerateHtmlStreaming = (api: AiApi) => {
  return api === 'vercel' ? generateVercelHtmlStreaming : generateNativeHtmlStreaming
}

export const getGenerateText = (api: AiApi) => {
  return api === 'vercel' ? generateVercelText : generateNativeText
}

export const getGenerateTextStreaming = (api: AiApi) => {
  return api === 'vercel' ? generateVercelTextStreaming : generateNativeTextStreaming
}

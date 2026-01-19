import { AI_APIS, type AiApi, PROVIDERS, type Provider } from '@infonomic/ai'

const STORAGE_KEY = 'editor-chat-configuration'

export interface ChatConfiguration {
  provider: Provider
  model: string
  api: AiApi
}

const isChatConfiguration = (value: unknown): value is ChatConfiguration => {
  if (value == null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.provider === 'string' &&
    PROVIDERS.includes(v.provider as Provider) &&
    typeof v.model === 'string' &&
    typeof v.api === 'string' &&
    AI_APIS.includes(v.api as AiApi)
  )
}

export const saveChatConfiguration = (config: ChatConfiguration) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.warn('Failed to save chat configuration:', error)
  }
}

export const loadChatConfiguration = (): ChatConfiguration | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isChatConfiguration(parsed) ? parsed : null
  } catch (error) {
    console.warn('Failed to load chat configuration:', error)
    return null
  }
}

export const clearChatConfiguration = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear chat configuration:', error)
  }
}

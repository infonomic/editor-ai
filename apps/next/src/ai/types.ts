/**
 * Credit: Adapted from https://github.com/ashbuilds/payload-ai
 * Portions copyright Ash Builds, licensed under MIT.
 */

import type { CSSProperties, MouseEventHandler } from 'react'

import type { ImageGenerateParams } from 'openai/resources/images'

export interface GenerationModel {
  fields: string[]
  generateText?: (prompt: string, system: string) => Promise<string>
  handler?: (prompt: string, options: any) => Promise<any> | Response
  id: string
  name: string
  output: 'audio' | 'file' | 'image' | 'json' | 'text' | 'video'
  // settings?: GroupField
  supportsPromptOptimization?: boolean
}

export interface GenerationConfig {
  models: GenerationModel[]
  provider: string
}

export type ActionMenuItems =
  | 'Compose'
  | 'Expand'
  | 'Proofread'
  | 'Rephrase'
  | 'Settings'
  | 'Simplify'
  | 'Summarize'
  | 'Tone'
  | 'Translate'

export type ActionPromptOptions = {
  layout?: string
  locale?: string
  prompt?: string
  systemPrompt?: string
}

export type ActionPrompt = {
  layout?: (options?: ActionPromptOptions) => string
  name: ActionMenuItems
  system: (options: ActionPromptOptions) => string
}

export type SeedPromptOptions = {
  fieldLabel: string
  fieldSchemaPaths: Record<string, any>
  fieldType: string
  path: string
}

export type ActionMenuEvents =
  | 'onCompose'
  | 'onExpand'
  | 'onProofread'
  | 'onRephrase'
  | 'onSettings'
  | 'onSimplify'
  | 'onSummarize'
  | 'onTone'
  | 'onTranslate'

export type UseMenuEvents = {
  [key in ActionMenuEvents]?: (data?: unknown) => void
}

export type UseMenuOptions = {
  isConfigAllowed: boolean
}

export type BaseItemProps<T = any> = {
  children?: React.ReactNode
  disabled?: boolean
  hideIcon?: boolean
  isActive?: boolean
  isMenu?: boolean
  onClick: (data?: unknown) => void
  onMouseEnter?: MouseEventHandler<T> | undefined
  onMouseLeave?: MouseEventHandler<T> | undefined
  style?: CSSProperties | undefined
  title?: string
}

export type ImageReference = {
  data: Blob
  name: string
  size: number
  type: string
  url: string
}

export type GenerateImageParams = {
  images?: ImageReference[]
  size?: ImageGenerateParams['size']
  style?: ImageGenerateParams['style']
  version?: ImageGenerateParams['model']
}

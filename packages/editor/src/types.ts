import type { EditorConfig as LexicalEditorConfig, SerializedEditorState } from 'lexical'

import type { EditorConfig, EditorSettings } from './field/config/types'

export interface LexicalEditorProps {
  settings?: (config: EditorSettings) => EditorSettings
  lexical?: LexicalEditorConfig
}

export type EditorFieldProps = {
  name: string
  id: string
  label?: string
  description?: string
  required?: boolean
  readonly?: boolean
  placeholder?: string
  className?: string
  editorConfig: EditorConfig
  defaultValue?: SerializedEditorState
  value?: SerializedEditorState
  onChange?: (value: SerializedEditorState) => void
  validate?: (
    value: SerializedEditorState | undefined,
    options: { required?: boolean }
  ) => string | boolean | Promise<string | boolean>
  onError?: (error: Error) => void
  lexicalEditorProps?: LexicalEditorProps
}

'use client'

import * as React from 'react'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'

import {
  type AiApi,
  getDefaultModel,
  type InstructionState,
  isProvider,
  normalizeChatApi,
  PROVIDER_MODELS,
  PROVIDERS,
  type Provider,
} from '@infonomic/ai'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_NORMAL,
  createCommand,
  SELECTION_CHANGE_COMMAND,
  type SerializedEditorState,
} from 'lexical'

import { DropDown, DropDownItem } from '../../ui/dropdown'
import { TextArea } from '../../ui/text-area'
import { Button } from '../../ui/button'

import { importHtmlToSerializedEditorState } from './import-html'
import { loadChatConfiguration, saveChatConfiguration } from './storage'
import { createEmptyEditorState } from './create-empty-editor-state'

import { mergeRegister } from '@lexical/utils'

import './index.css'

type EditorChatState = {
  editorValue: SerializedEditorState | undefined
  api: AiApi
  provider: Provider
  model: string
  promptValue: string
}

type EditorChatAction =
  | { type: 'hydrate'; value: { api: AiApi; provider: Provider; model: string } }
  | { type: 'setEditorValue'; value: SerializedEditorState | undefined }
  | { type: 'resetEditor'; emptyEditorState: SerializedEditorState }
  | { type: 'setPromptValue'; value: string }
  | { type: 'setApi'; value: AiApi }
  | { type: 'setProvider'; value: Provider }
  | { type: 'setModel'; value: string }


export const TOGGLE_AI_DRAWER_COMMAND = createCommand('TOGGLE_AI_DRAWER_COMMAND')

const editorChatReducer = (state: EditorChatState, action: EditorChatAction): EditorChatState => {
  switch (action.type) {
    case 'hydrate': {
      const modelsForProvider = PROVIDER_MODELS[action.value.provider] ?? []
      const model = modelsForProvider.includes(action.value.model)
        ? action.value.model
        : getDefaultModel(action.value.provider)
      return {
        ...state,
        api: action.value.api,
        provider: action.value.provider,
        model,
      }
    }
    case 'setEditorValue':
      return { ...state, editorValue: action.value }
    case 'resetEditor':
      return { ...state, editorValue: action.emptyEditorState }
    case 'setPromptValue':
      return { ...state, promptValue: action.value }
    case 'setApi':
      return { ...state, api: action.value }
    case 'setProvider':
      return {
        ...state,
        provider: action.value,
        model: getDefaultModel(action.value),
      }
    case 'setModel':
      return { ...state, model: action.value }
  }
}

const initialInstructionState: InstructionState = {
  prompt: '',
  editor: null,
  errors: {},
  status: 'idle',
  lastRun: null,
}

const initialEditorChatState: EditorChatState = {
  editorValue: undefined,
  api: 'native',
  provider: 'openai',
  model: getDefaultModel('openai'),
  promptValue: '',
}

const formatLastRun = (ms: number): string => {
  const safe = Number.isFinite(ms) ? Math.max(0, Math.floor(ms)) : 0
  const minutes = Math.floor(safe / 60_000)
  const seconds = Math.floor((safe % 60_000) / 1_000)
  const milliseconds = safe % 1_000

  return `${minutes}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`
}



export function AiPlugin(): React.JSX.Element | undefined {
  const [state, dispatch] = useReducer(editorChatReducer, initialEditorChatState)
  const [formState, setFormState] = useState<InstructionState>(initialInstructionState)
  const [isPending, setIsPending] = useState(false)
  const [useStreaming, setUseStreaming] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hydratedRef = useRef(false)
  const skipPersistOnceRef = useRef(false)
  const emptyEditorState: SerializedEditorState = useMemo(() => createEmptyEditorState(), [])
  const [open, setOpen] = React.useState(false)
  const [editor] = useLexicalComposerContext()
  const [isEditable, setIsEditable] = useState(() => editor.isEditable())
  const [activeEditor, setActiveEditor] = useState(editor)
  // const emptyEditorState: SerializedEditorState = useMemo(() => createEmptyEditorState(), [])

  function handleOnSave(): void {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(activeEditor.getEditorState()))
  }

  function handleOnClear(): void {
    activeEditor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)
    activeEditor.focus()
  }

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor)
        return false
      },
      COMMAND_PRIORITY_CRITICAL
    )
  }, [editor])

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand<null>(
        TOGGLE_AI_DRAWER_COMMAND,
        () => {
          setOpen(!open)
          return true
        },
        COMMAND_PRIORITY_NORMAL
      )
    )
  }, [editor, open])

  useEffect(() => {
    return mergeRegister(
      editor.registerEditableListener((editable) => {
        setIsEditable(editable)
      })
    )
  }, [editor])

  useEffect(() => {
    const config = loadChatConfiguration()
    if (config && PROVIDER_MODELS[config.provider]) {
      dispatch({
        type: 'hydrate',
        value: {
          api: normalizeChatApi(config.api),
          provider: config.provider,
          model: config.model,
        },
      })
      skipPersistOnceRef.current = true
    }
    hydratedRef.current = true
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false
      return
    }
    saveChatConfiguration({ provider: state.provider, model: state.model, api: state.api })
  }, [state.provider, state.model, state.api])

  const editorJson = useMemo(() => {
    return JSON.stringify(state.editorValue ?? emptyEditorState)
  }, [state.editorValue, emptyEditorState])

  useEffect(() => {
    if (formState?.status === 'success') {
      if (formState.format === 'html' && formState.html) {
        try {
          dispatch({
            type: 'setEditorValue',
            value: importHtmlToSerializedEditorState(formState.html, activeEditor),
          })
        } catch {
          dispatch({ type: 'setEditorValue', value: emptyEditorState })
        }
        return
      }

      if (formState.editor) {
        dispatch({ type: 'setEditorValue', value: formState.editor as SerializedEditorState })
      }
    }
  }, [formState, emptyEditorState])

  const handleOnEditorChange = (value: SerializedEditorState) => {
    dispatch({ type: 'setEditorValue', value })
  }

  const handleOnPromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'setPromptValue', value: event.target.value })
  }

  const handleOnProviderChange = (value: string) => {
    if (!isProvider(value)) return
    dispatch({ type: 'setProvider', value })
  }

  const handleOnModelChange = (value: string) => {
    if (!value) return
    const modelsForProvider = PROVIDER_MODELS[state.provider] ?? []
    if (!modelsForProvider.includes(value)) return
    dispatch({ type: 'setModel', value })
  }

  const handleOnApiChange = (value: string) => {
    dispatch({ type: 'setApi', value: normalizeChatApi(value) })
  }

  const handleOnKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  const handleOnResetEditor = () => {
    dispatch({ type: 'resetEditor', emptyEditorState })
  }

  const handleOnCancel = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsPending(false)
    setFormState((prev) => ({ ...prev, status: 'idle', message: 'Cancelled.', errors: {} }))
  }

  const handleOnSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!state.promptValue.trim()) return
    if (isPending) return

    // Cancel any previous in-flight request before starting a new one.
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsPending(true)
    setFormState((prev) => ({ ...prev, status: 'idle', errors: {}, message: undefined }))

    try {
      const response = await fetch('/routes/ai', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          prompt: state.promptValue,
          editor: editorJson,
          provider: state.provider,
          model: state.model,
          api: state.api,
        }),
      })

      const data = (await response.json()) as InstructionState
      setFormState(data)
    } catch (error) {
      const err = error as any
      if (err?.name === 'AbortError') {
        setFormState((prev) => ({ ...prev, status: 'idle', message: 'Cancelled.', errors: {} }))
      } else {
        setFormState({
          ...initialInstructionState,
          status: 'failed',
          message: 'There was a problem submitting your instructions.',
          errors: {},
        })
      }
    } finally {
      setIsPending(false)
      abortControllerRef.current = null
    }
  }

  const handleOnSubmitStreaming = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!state.promptValue.trim()) return
    if (isPending) return

    // Cancel any previous in-flight request before starting a new one.
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsPending(true)
    setFormState((prev) => ({ ...prev, status: 'idle', errors: {}, message: undefined }))

    try {
      const response = await fetch('/routes/ai-streaming', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        signal: abortController.signal,
        body: JSON.stringify({
          prompt: state.promptValue,
          editor: editorJson,
          provider: state.provider,
          model: state.model,
          api: state.api,
        }),
      })

      if (response.body == null) {
        console.log('Streaming request has no body - falling back to non-streaming handling.')
        const data = (await response.json()) as InstructionState
        setFormState(data)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalState: InstructionState | null = null

      while (true) {
        const { value, done } = await reader.read()
        console.log('Streaming response read', { value, done })
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        console.log('Streaming response decoded lines', { lines })

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const payload = JSON.parse(trimmed) as {
              type?: string
              text?: string
              state?: InstructionState
            }

            console.log('Streaming response payload per line', payload)

            if (payload.type === 'final' && payload.state) {
              finalState = payload.state
            }
          } catch {
            // ignore malformed chunks
          }
        }
      }

      if (finalState) {
        setFormState(finalState)
      } else {
        setFormState({
          ...initialInstructionState,
          status: 'failed',
          message: 'There was a problem submitting your instructions.',
          errors: {},
        })
      }
    } catch (error) {
      const err = error as any
      if (err?.name === 'AbortError') {
        setFormState((prev) => ({ ...prev, status: 'idle', message: 'Cancelled.', errors: {} }))
      } else {
        setFormState({
          ...initialInstructionState,
          status: 'failed',
          message: 'There was a problem submitting your instructions.',
          errors: {},
        })
      }
    } finally {
      setIsPending(false)
      abortControllerRef.current = null
    }
  }

  return (
    <div className={`lexical-ai-plugin ${open ? 'lexical-ai-plugin--visible' : ''}`}>
      <TextArea
        label="AI Assistant"
        placeholder="Ask AI to help you write..."
        value={state.promptValue}
        onChange={() => { }}
      />
      <div className="lexical-ai-plugin__actions">
        <DropDown
          disabled={!isEditable}
          buttonClassName="ai-plugin-button"
          buttonLabel={PROVIDERS.find(([value]) => value === state.provider)?.[1] ?? 'Select Provider'}
          buttonAriaLabel="Select AI Provider"
        >
          {PROVIDERS.map(([value, name]) => {
            return (
              <DropDownItem
                className="item"
                onClick={() => {
                  console.log(`Selected AI provider: ${value}`)
                  handleOnProviderChange(value)
                }}
                key={value}
              >
                <span className="text">{name}</span>
              </DropDownItem>
            )
          })}
        </DropDown>
        <DropDown
          disabled={!isEditable}
          buttonClassName="ai-plugin-button"
          buttonLabel={state.model}
          buttonAriaLabel="Select AI Model"
        >
          {(PROVIDER_MODELS[state.provider] ?? []).map((modelOption) => (
            <DropDownItem
              className="item"
              onClick={() => {
                console.log(`Selected AI provider: ${modelOption}`)
                handleOnModelChange(modelOption)
              }}
              key={modelOption}
            >
              <span className="text">{modelOption}</span>
            </DropDownItem>
          ))}
        </DropDown>
        <button type="button" className="ai-plugin-button" onClick={handleOnSave}>
          Save
        </button>
        <button type="button" className="ai-plugin-button" onClick={handleOnClear}>
          Clear
        </button>
      </div>
      <p className="lexical-ai-plugin__disclaimer">
        AI-generated content may be inaccurate, incomplete, or misleading. Please use caution and
        verify information from reliable sources.
      </p>
    </div>
  )
}

'use client'

import * as React from 'react'
import { useEffect, useReducer, useRef, useState } from 'react'

import type { AiApi, InstructionState, Provider } from '@infonomic/ai'
import { getDefaultModel, isProvider, normalizeChatApi, PROVIDER_MODELS } from '@infonomic/ai'
import {
  Button,
  Checkbox,
  LoaderEllipsis,
  Select,
  SelectItem,
  StopIcon,
  TextArea,
} from '@infonomic/uikit/react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { mergeRegister } from '@lexical/utils'
import {
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_NORMAL,
  createCommand,
  type LexicalEditor,
  SELECTION_CHANGE_COMMAND,
  type SerializedEditorState,
} from 'lexical'

import { importHtmlToSerializedEditorState } from './import-html'
import { loadChatConfiguration, saveChatConfiguration } from './storage'

import './index.css'

type EditorChatState = {
  api: AiApi
  provider: Provider
  model: string
  promptValue: string
}

type EditorChatAction =
  | { type: 'hydrate'; value: { api: AiApi; provider: Provider; model: string } }
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
  const [instructionState, setInstructionState] = useState<InstructionState>(initialInstructionState)
  const [isPending, setIsPending] = useState(false)
  const [useStreaming, setUseStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const submitEditorRef = useRef<LexicalEditor | null>(null)
  const hydratedRef = useRef(false)
  const skipPersistOnceRef = useRef(false)
  const [open, setOpen] = React.useState(false)
  const [editor] = useLexicalComposerContext()
  const [activeEditor, setActiveEditor] = useState(editor)

  function handleOnDebug(): void {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(activeEditor.getEditorState()))
  }

  function handleOnFullReset(): void {
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

  useEffect(() => {
    if (instructionState?.status === 'success') {
      const targetEditor = submitEditorRef.current ?? editor
      if (instructionState.format === 'html' && instructionState.html) {
        try {
          importHtmlToSerializedEditorState(instructionState.html, targetEditor)
        } catch {
          targetEditor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)
        }
        return
      }

      if (instructionState.editor) {
        const nextState = targetEditor.parseEditorState(instructionState.editor as SerializedEditorState)
        targetEditor.update(
          () => {
            targetEditor.setEditorState(nextState)
          },
          { discrete: true }
        )
      }
    }
  }, [instructionState, editor])

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
      if (useStreaming) {
        void handleOnSubmitStreaming()
        return
      }
      void handleOnSubmit()
    }
  }

  const handleOnClear = () => {
    activeEditor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)
    activeEditor.focus()
  }

  const handleOnCancel = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsPending(false)
    setInstructionState((prev) => ({ ...prev, status: 'idle', message: 'Cancelled.', errors: {} }))
  }

  const handleOnSubmit = async () => {
    if (!state.promptValue.trim()) return
    if (isPending) return

    // Cancel any previous in-flight request before starting a new one.
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    submitEditorRef.current = activeEditor
    setIsPending(true)
    setInstructionState((prev) => ({ ...prev, status: 'idle', errors: {}, message: undefined }))

    const editorJson = JSON.stringify(activeEditor.getEditorState().toJSON())

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
      setInstructionState(data)
    } catch (error) {
      const err = error as any
      if (err?.name === 'AbortError') {
        setInstructionState((prev) => ({ ...prev, status: 'idle', message: 'Cancelled.', errors: {} }))
      } else {
        setInstructionState({
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

  const handleOnSubmitStreaming = async () => {
    if (!state.promptValue.trim()) return
    if (isPending) return

    // Cancel any previous in-flight request before starting a new one.
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    submitEditorRef.current = activeEditor
    setIsPending(true)
    setInstructionState((prev) => ({ ...prev, status: 'idle', errors: {}, message: undefined }))

    const editorJson = JSON.stringify(activeEditor.getEditorState().toJSON())

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
        setInstructionState(data)
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
        setInstructionState(finalState)
      } else {
        setInstructionState({
          ...initialInstructionState,
          status: 'failed',
          message: 'There was a problem submitting your instructions.',
          errors: {},
        })
      }
    } catch (error) {
      const err = error as any
      if (err?.name === 'AbortError') {
        setInstructionState((prev) => ({ ...prev, status: 'idle', message: 'Cancelled.', errors: {} }))
      } else {
        setInstructionState({
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
        label="Prompt"
        id="prompt"
        name="prompt"
        rows={5}
        value={state.promptValue}
        onChange={handleOnPromptChange}
        onKeyDown={handleOnKeyDown}
        disabled={isPending === true}
        spellCheck={true}
        // error={hasErrors('prompt', null, instructionState?.errors)}
        // errorText={getErrorText('prompt', null, instructionState?.errors)}
        helpText={`Enter your prompt (Cmd/Ctrl + Enter to submit). Last run: ${instructionState?.lastRun == null ? 'never' : formatLastRun(instructionState.lastRun)
          }`}
      />
      <div className="lexical-ai-plugin__actions">
        <Select
          name="provider"
          value={state.provider}
          onValueChange={handleOnProviderChange}
          variant="outlined"
        >
          <SelectItem value="openai">OpenAI</SelectItem>
          <SelectItem value="google">Google</SelectItem>
          <SelectItem value="anthropic">Anthropic</SelectItem>
        </Select>
        <Select
          name="model"
          value={state.model}
          onValueChange={handleOnModelChange}
          variant="outlined"
        >
          {(PROVIDER_MODELS[state.provider] ?? []).map((modelOption) => (
            <SelectItem key={modelOption} value={modelOption}>
              {modelOption}
            </SelectItem>
          ))}
        </Select>
        <Select
          key={state.api}
          name="api"
          value={state.api}
          onValueChange={handleOnApiChange}
          variant="outlined"
        >
          <SelectItem value="native">Native</SelectItem>
          <SelectItem value="vercel">Vercel</SelectItem>
        </Select>
        <div className="mr-2">
          <Checkbox
            name="streaming"
            id="streaming"
            defaultChecked={useStreaming}
            onCheckedChange={(checked) => {
              setUseStreaming(checked === true)
            }}
            label="Streaming"
          />
        </div>
        <Button
          fullWidth={false}
          type="button"
          onClick={useStreaming ? handleOnSubmitStreaming : handleOnSubmit}
          disabled={!state.promptValue.trim() || isPending === true}
        >
          {isPending === true ? <LoaderEllipsis size={30} /> : <span>Submit</span>}
        </Button>
        <Button
          className="py-0 px-4"
          title="Stop"
          aria-label="Stop"
          onClick={handleOnCancel}
          disabled={isPending === false}
          type="button"
        >
          <StopIcon width="22px" height="22px" />
        </Button>
        <Button
          fullWidth={false}
          type="button"
          onClick={handleOnClear}
          disabled={isPending === true}
        >
          Reset Editor
        </Button>
        <Button className="ai-plugin-button" onClick={handleOnFullReset}>
          Full Reset
        </Button>
        <Button className="ai-plugin-button" onClick={handleOnDebug}>
          Debug
        </Button>
      </div>
      {instructionState?.status === 'success' && isPending === false && (
        <p className="ai-plugin-success-message">{instructionState.message}</p>
      )}

      {instructionState?.status === 'failed' && isPending === false && (
        <p className="ai-plugin-error-message">{instructionState.message}</p>
      )}
      <p className="lexical-ai-plugin__disclaimer">
        AI-generated content may be inaccurate, incomplete, or misleading. Please use caution and
        verify information from reliable sources.
      </p>
    </div>
  )
}

'use client'

import { useActionState, useEffect, useMemo, useReducer, useRef } from 'react'

import { createEmptyEditorState } from '@infonomic/editor'
import {
  Alert,
  Button,
  IconButton,
  LoaderEllipsis,
  Select,
  SelectItem,
  StopIcon,
  TextArea,
} from '@infonomic/uikit/react'
import type { SerializedEditorState } from 'lexical'

import {
  DEFAULT_MODEL as ANTHROPIC_DEFAULT_MODEL,
  MODELS as ANTHROPIC_MODELS,
} from '@/ai/models/anthropic'
import { DEFAULT_MODEL as GOOGLE_DEFAULT_MODEL, MODELS as GOOGLE_MODELS } from '@/ai/models/google'
import { DEFAULT_MODEL as OPENAI_DEFAULT_MODEL, MODELS as OPENAI_MODELS } from '@/ai/models/openai'
import { RichTextField } from '@/ui/fields/richtext-field'
import { type ChatApi, type InstructionState, normalizeChatApi, type Provider } from '../@types'
import { executeInstruction } from '../action'
import { importHtmlToSerializedEditorState } from '../import-html'
import { loadChatConfiguration, saveChatConfiguration } from '../storage'

const PROVIDER_MODELS: Record<Provider, readonly string[]> = {
  openai: OPENAI_MODELS,
  google: GOOGLE_MODELS,
  anthropic: ANTHROPIC_MODELS,
}

const getDefaultModel = (provider: Provider): string => {
  switch (provider) {
    case 'openai':
      return OPENAI_DEFAULT_MODEL
    case 'google':
      return GOOGLE_DEFAULT_MODEL
    case 'anthropic':
      return ANTHROPIC_DEFAULT_MODEL
  }
}

const isProvider = (value: string): value is Provider => {
  return value === 'openai' || value === 'google' || value === 'anthropic'
}

type EditorChatState = {
  editorValue: SerializedEditorState | undefined
  api: ChatApi
  provider: Provider
  model: string
  promptValue: string
}

type EditorChatAction =
  | { type: 'hydrate'; value: { api: ChatApi; provider: Provider; model: string } }
  | { type: 'setEditorValue'; value: SerializedEditorState | undefined }
  | { type: 'resetEditor'; emptyEditorState: SerializedEditorState }
  | { type: 'setPromptValue'; value: string }
  | { type: 'setApi'; value: ChatApi }
  | { type: 'setProvider'; value: Provider }
  | { type: 'setModel'; value: string }

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

export const EditorChat = () => {
  const [state, dispatch] = useReducer(editorChatReducer, initialEditorChatState)
  const [formState, formAction, isPending] = useActionState(
    executeInstruction,
    initialInstructionState
  )
  const formRef = useRef<HTMLFormElement | null>(null)
  const hydratedRef = useRef(false)
  const skipPersistOnceRef = useRef(false)
  const emptyEditorState: SerializedEditorState = useMemo(() => createEmptyEditorState(), [])

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
            value: importHtmlToSerializedEditorState(formState.html),
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

  const handleOnApiChange = (value: string) => {
    dispatch({ type: 'setApi', value: normalizeChatApi(value) })
  }

  const handleOnModelChange = (value: string) => {
    if (!value) return
    const modelsForProvider = PROVIDER_MODELS[state.provider] ?? []
    if (!modelsForProvider.includes(value)) return
    dispatch({ type: 'setModel', value })
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

  return (
    <div className="max-w-240 mx-auto">
      {formState?.status === 'success' && isPending === false && (
        <Alert intent="success">
          <span>{formState.message}</span>
        </Alert>
      )}

      {formState?.status === 'failed' && isPending === false && (
        <Alert intent="danger">
          <span>'There was a problem submitting your instructions.</span>
        </Alert>
      )}
      <form ref={formRef} className="flex flex-col gap-2 mt-8" action={formAction} noValidate>
        <input type="hidden" name="editor" value={editorJson} />
        <input type="hidden" name="api" value={state.api} />
        <input type="hidden" name="provider" value={state.provider} />
        <input type="hidden" name="model" value={state.model} />
        <RichTextField
          onChange={handleOnEditorChange}
          value={state.editorValue}
          readonly={isPending === true}
          field={{ name: 'editor', label: 'Editor' }}
        />
        <div className="flex flex-col gap-4">
          <TextArea
            label="Prompt"
            id="prompt"
            name="prompt"
            rows={5}
            value={state.promptValue}
            onChange={handleOnPromptChange}
            onKeyDown={handleOnKeyDown}
            disabled={isPending === true}
            // error={hasErrors('prompt', null, formState?.errors)}
            // errorText={getErrorText('prompt', null, formState?.errors)}
            helpText={`Enter your prompt (Cmd/Ctrl + Enter to submit). Last run: ${
              formState?.lastRun == null ? 'never' : formatLastRun(formState.lastRun)
            }`}
          />
          <div className="flex options gap-2 items-center">
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
            <Button
              fullWidth={false}
              type="submit"
              disabled={!state.promptValue.trim() || isPending === true}
            >
              {isPending === true ? <LoaderEllipsis size={30} /> : <span>Submit</span>}
            </Button>
            <Button className="py-0 px-4" disabled={isPending === false} type="button">
              <StopIcon width="22px" height="22px" />
            </Button>
            <Button
              fullWidth={false}
              type="button"
              onClick={handleOnResetEditor}
              disabled={isPending === true}
            >
              Reset Editor
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

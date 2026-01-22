'use client'

import { useEffect, useMemo, useReducer, useRef, useState } from 'react'

import {
  type AiApi,
  getDefaultModel,
  type InstructionState,
  isProvider,
  normalizeChatApi,
  PROVIDER_MODELS,
  type Provider,
} from '@infonomic/ai'
import { createEmptyEditorState } from '@infonomic/editor'
import {
  Alert,
  Button,
  Checkbox,
  LoaderEllipsis,
  Select,
  SelectItem,
  StopIcon,
  TextArea,
} from '@infonomic/uikit/react'
import type { SerializedEditorState } from 'lexical'

import { RichTextField } from '@/ui/fields/richtext-field'
import { importHtmlToSerializedEditorState } from '../import-html'
import { loadChatConfiguration, saveChatConfiguration } from '../storage'

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
  const [formState, setFormState] = useState<InstructionState>(initialInstructionState)
  const [isPending, setIsPending] = useState(false)
  const [useStreaming, setUseStreaming] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
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

      <form
        ref={formRef}
        className="flex flex-col gap-2 mt-8"
        onSubmit={useStreaming ? handleOnSubmitStreaming : handleOnSubmit}
        noValidate
      >
        <input type="hidden" name="editor" value={editorJson} />
        <input type="hidden" name="api" value={state.api} />
        <input type="hidden" name="provider" value={state.provider} />
        <input type="hidden" name="model" value={state.model} />

        <RichTextField
          onChange={handleOnEditorChange}
          value={state.editorValue}
          editorSettings={{
            options: {
              aiPlugin: true,
            },
            inlineImageUploadCollection: '',
            placeholderText: 'Start writing your content here...',
          }}
          minHeight={'350px'}
          maxHeight={'475px'}
          readonly={isPending === true}
          field={{ name: 'editor', label: 'Editor' }}
        />

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
          // error={hasErrors('prompt', null, formState?.errors)}
          // errorText={getErrorText('prompt', null, formState?.errors)}
          helpText={`Enter your prompt (Cmd/Ctrl + Enter to submit). Last run: ${formState?.lastRun == null ? 'never' : formatLastRun(formState.lastRun)
            }`}
        />

        {/* <div className="mb-4">Foo</div> */}

        <div className="flex items-center gap-3 mt-4 flex-wrap">
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
            type="submit"
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
            onClick={handleOnResetEditor}
            disabled={isPending === true}
          >
            Reset Editor
          </Button>
        </div>
      </form>
    </div>
  )
}

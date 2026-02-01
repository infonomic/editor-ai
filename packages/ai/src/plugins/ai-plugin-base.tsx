'use client'

import * as React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { InstructionState, Provider, Sdk } from '@infonomic/ai'
import { getDefaultModel, isProvider, normalizeSdk, PROVIDER_MODELS } from '@infonomic/ai'
import {
  Button,
  Checkbox,
  CloseIcon,
  IconButton,
  InfoIcon,
  LoaderEllipsis,
  Modal,
  ScrollArea,
  Select,
  SelectItem,
  // Checkbox,
  SettingsSlidersIcon,
  StopIcon,
  TextArea,
  useModal,
} from '@infonomic/uikit/react'

import { loadChatConfiguration, saveChatConfiguration } from './storage'
import { appendRollingPreviewText } from './streaming-preview'

import './ai-plugin.css'

type EditorChatState = {
  // mode: 'edit' | 'generate'
  sdk: Sdk
  provider: Provider
  model: string
}

export type AiPluginSubmitContext = {
  prompt: string
  provider: Provider
  model: string
  sdk: Sdk
  isPending: boolean
  setIsPending: React.Dispatch<React.SetStateAction<boolean>>
  instructionState: InstructionState
  setInstructionState: React.Dispatch<React.SetStateAction<InstructionState>>
  abortControllerRef: React.RefObject<AbortController | null>
  appendStreamPreview: (chunk: string) => void
  resetStreamPreview: () => void
  useStreaming: boolean
  setUseStreaming: React.Dispatch<React.SetStateAction<boolean>>
}

export type AiPluginBaseDrawer = {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  toggleOpen: () => void
}

export type AiPluginBaseProps = {
  onSubmit: (context: AiPluginSubmitContext) => Promise<void> | void
  onSubmitStreaming?: (context: AiPluginSubmitContext) => Promise<void> | void
  onCancel?: () => void
  onClear?: () => void
  onDebug?: () => void
  helpTitle?: React.ReactNode
  helpContent?: React.ReactNode
  onDrawer?: (drawer: AiPluginBaseDrawer) => void
}

const initialInstructionState: InstructionState = {
  prompt: '',
  editor: null,
  errors: {},
  status: 'idle',
  lastRun: null,
}

const initialEditorChatState: EditorChatState = {
  // mode: 'edit',
  sdk: 'native',
  provider: 'openai',
  model: getDefaultModel('openai'),
}

const formatLastRun = (ms: number): string => {
  const safe = Number.isFinite(ms) ? Math.max(0, Math.floor(ms)) : 0
  const minutes = Math.floor(safe / 60_000)
  const seconds = Math.floor((safe % 60_000) / 1_000)
  const milliseconds = safe % 1_000

  return `${minutes}:${String(seconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`
}

const STREAM_PREVIEW_MAX_CHARS = 200
const STREAM_PREVIEW_UPDATE_INTERVAL_MS = 150

export const AiPluginBase = React.memo(function AiPluginBase(
  props: AiPluginBaseProps
): React.JSX.Element | undefined {
  const { onDismiss, isOpen, setIsOpen } = useModal()
  const [state, setState] = useState<EditorChatState>(initialEditorChatState)
  const [instructionState, setInstructionState] =
    useState<InstructionState>(initialInstructionState)
  const [isPending, setIsPending] = useState(false)
  const [useStreaming, setUseStreaming] = useState(true)
  const [prompt, setPrompt] = useState('')
  const [streamPreviewText, setStreamPreviewText] = useState('')
  const streamPreviewAccumulatorRef = useRef('')
  const streamPreviewLastFlushMsRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hydratedRef = useRef(false)
  const skipPersistOnceRef = useRef(false)
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const toggleOpen = useCallback(() => {
    setOpen((prevOpen) => !prevOpen)
  }, [])

  const resetStreamPreview = () => {
    streamPreviewAccumulatorRef.current = ''
    streamPreviewLastFlushMsRef.current = 0
    setStreamPreviewText('')
  }

  const appendStreamPreview = (chunk: string) => {
    streamPreviewAccumulatorRef.current = appendRollingPreviewText(
      streamPreviewAccumulatorRef.current,
      chunk,
      { maxChars: STREAM_PREVIEW_MAX_CHARS }
    )

    const now = Date.now()
    if (now - streamPreviewLastFlushMsRef.current < STREAM_PREVIEW_UPDATE_INTERVAL_MS) return
    streamPreviewLastFlushMsRef.current = now
    setStreamPreviewText(streamPreviewAccumulatorRef.current)
  }

  const handleOnPromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value)
  }

  const handleOnProviderChange = (value: string) => {
    if (!isProvider(value)) return
    setState((prev) => ({
      ...prev,
      provider: value,
      model: getDefaultModel(value),
    }))
  }

  const handleOnSdkChange = (value: 'native' | 'vercel') => {
    setState((prev) => ({
      ...prev,
      sdk: value,
    }))
  }

  const handleOnModelChange = (value: string) => {
    if (!value) return
    const modelsForProvider = PROVIDER_MODELS[state.provider] ?? []
    if (!modelsForProvider.includes(value)) return
    setState((prev) => ({ ...prev, model: value }))
  }

  const buildSubmitContext = (): AiPluginSubmitContext => ({
    prompt,
    provider: state.provider,
    model: state.model,
    sdk: state.sdk,
    isPending,
    setIsPending,
    instructionState,
    setInstructionState,
    abortControllerRef,
    appendStreamPreview,
    resetStreamPreview,
    useStreaming,
    setUseStreaming,
  })

  const handleOnSubmit = () => {
    if (!prompt.trim()) return
    if (isPending) return
    void props.onSubmit(buildSubmitContext())
  }

  const handleOnSubmitStreaming = () => {
    if (!prompt.trim()) return
    if (isPending) return
    const handler = props.onSubmitStreaming ?? props.onSubmit
    if (!handler) return
    void handler(buildSubmitContext())
  }

  const handleOnKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      if (useStreaming) {
        handleOnSubmitStreaming()
        return
      }
      handleOnSubmit()
    }
  }

  const handleOnCancel = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsPending(false)
    resetStreamPreview()
    setInstructionState((prev) => ({ ...prev, status: 'idle', message: 'Cancelled.', errors: {} }))
    props.onCancel?.()
  }

  useEffect(() => {
    const config = loadChatConfiguration()
    if (config && PROVIDER_MODELS[config.provider]) {
      const modelsForProvider = PROVIDER_MODELS[config.provider] ?? []
      const model = modelsForProvider.includes(config.model)
        ? config.model
        : getDefaultModel(config.provider)

      setState({
        sdk: normalizeSdk(config.sdk),
        // mode: config.mode,
        provider: config.provider,
        model,
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
    saveChatConfiguration({ provider: state.provider, model: state.model, sdk: state.sdk })
  }, [state.provider, state.model, state.sdk])

  useEffect(() => {
    props.onDrawer?.({ setOpen, toggleOpen })
  }, [props.onDrawer, toggleOpen])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    }
  }, [])

  return (
    <div className={`ai-plugin__drawer ${open ? 'ai-plugin__drawer--visible' : ''}`}>
      <div
        className={`ai-plugin__stream-preview ${isPending && useStreaming ? 'ai-plugin__stream-preview--visible' : ''}`}
        aria-live="polite"
        aria-busy="true"
      >
        <div className="ai-plugin__stream-preview__label">Streaming preview</div>
        <div className="ai-plugin__stream-preview__content">
          {streamPreviewText || 'Receiving…'}
        </div>
      </div>

      <TextArea
        className="ai-plugin__prompt"
        label="Prompt"
        id="prompt"
        name="prompt"
        rows={5}
        value={prompt}
        onChange={handleOnPromptChange}
        onKeyDown={handleOnKeyDown}
        disabled={isPending === true}
        spellCheck={true}
        helpText={`Enter your prompt (Cmd/Ctrl + Enter to submit). Last run: ${instructionState?.lastRun == null ? 'never' : formatLastRun(instructionState.lastRun)
          }`}
      />
      <div className="ai-plugin__actions">
        <IconButton
          aria-label="Help"
          size="sm"
          variant="text"
          onClick={() => {
            setSettingsOpen(!settingsOpen)
          }}
        >
          <SettingsSlidersIcon />
        </IconButton>
        <Button
          fullWidth={false}
          type="button"
          onClick={useStreaming ? handleOnSubmitStreaming : handleOnSubmit}
          disabled={!prompt.trim() || isPending === true}
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
          onClick={props.onClear}
          disabled={isPending === true}
        >
          Clear
        </Button>
      </div>
      {instructionState?.status === 'success' && isPending === false && (
        <p className="ai-plugin__messages--success-message">{instructionState.message}</p>
      )}

      {instructionState?.status === 'failed' && isPending === false && (
        <p className="ai-plugin__messages--error-message">{instructionState.message}</p>
      )}
      <div className={`ai-plugin__settings ${settingsOpen ? 'ai-plugin__settings--visible' : ''}`}>
        <Select
          name="provider"
          disabled={isPending === true}
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
          disabled={isPending === true}
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
          key={state.sdk}
          name="sdk"
          value={state.sdk}
          onValueChange={handleOnSdkChange}
          disabled={isPending === true}
          variant="outlined"
        >
          <SelectItem value="native">Native</SelectItem>
          <SelectItem value="vercel">Vercel</SelectItem>
        </Select>
        <div className="mr-2">
          <Checkbox
            name="streaming"
            id="streaming"
            disabled={isPending === true}
            checked={useStreaming}
            onCheckedChange={(checked) => {
              setUseStreaming(checked === true)
            }}
            label="Streaming"
          />
        </div>
        <Button variant="text" disabled={isPending === true} onClick={props.onDebug}>
          Debug
        </Button>
      </div>
      <div className="ai-plugin__footer">
        <p className="ai-plugin__disclaimer">
          AI-generated content may be inaccurate, incomplete, or misleading. Please use caution and
          verify information from reliable sources.
        </p>
        <span className="ai-plugin__help">
          <IconButton
            aria-label="Help"
            size="sm"
            variant="text"
            onClick={() => {
              setIsOpen(true)
            }}
          >
            <InfoIcon width="22px" height="22px" svgClassName="ai-plugin__help_icon" />
          </IconButton>
        </span>
      </div>
      <Modal isOpen={isOpen} onDismiss={onDismiss} closeOnOverlayClick={true}>
        <Modal.Container style={{ maxWidth: '600px', borderRadius: '4px' }}>
          <Modal.Header style={{ marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.75rem' }}>{props.helpTitle ?? 'AI Help'}</h2>
            <IconButton
              arial-label="Close"
              size="sm"
              onClick={() => {
                setIsOpen(false)
              }}
            >
              <CloseIcon width="16px" height="16px" svgClassName="white-icon" />
            </IconButton>
          </Modal.Header>
          <Modal.Content style={{ padding: '18px' }}>
            <ScrollArea
              style={{ height: '400px', paddingRight: '18px', fontSize: '14px' }}
              className="prose"
            >
              {props.helpContent ?? (
                <p style={{ margin: '0.5rem 0', fontSize: '16px' }}>No help content provided.</p>
              )}
            </ScrollArea>
          </Modal.Content>
          <Modal.Actions>
            <Button
              size="sm"
              style={{ minWidth: '80px' }}
              intent="primary"
              onClick={() => {
                setIsOpen(false)
              }}
              data-autofocus
            >
              Close
            </Button>
          </Modal.Actions>
        </Modal.Container>
      </Modal>
    </div>
  )
})

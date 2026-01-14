'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'

import { Alert, Button, LoaderEllipsis, Select, SelectItem, TextArea } from '@infonomic/uikit/react'
import type { SerializedEditorState } from 'lexical'

import {
  DEFAULT_MODEL as ANTHROPIC_DEFAULT_MODEL,
  MODELS as ANTHROPIC_MODELS,
} from '@/ai/models/anthropic'
import { DEFAULT_MODEL as GOOGLE_DEFAULT_MODEL, MODELS as GOOGLE_MODELS } from '@/ai/models/google'
import { DEFAULT_MODEL as OPENAI_DEFAULT_MODEL, MODELS as OPENAI_MODELS } from '@/ai/models/openai'
import { RichTextField } from '@/ui/fields/richtext-field'
import { executeInstruction } from '../action'
import { importHtmlToSerializedEditorState } from '../import-html'
import { loadChatConfiguration, saveChatConfiguration } from '../storage'
import type { InstructionState, Provider } from '../@types'

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

export const EditorChat = () => {
  const initialState: InstructionState = { prompt: '', editor: null, errors: {}, status: 'idle' }
  const [editorValue, setEditorValue] = useState<SerializedEditorState | undefined>(undefined)
  const [provider, setProvider] = useState<Provider>('openai')
  const [model, setModel] = useState<string>(getDefaultModel('openai'))
  const [promptValue, setPromptValue] = useState<string>('')
  const [formState, formAction, isPending] = useActionState(executeInstruction, initialState)
  const formRef = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    const config = loadChatConfiguration()
    if (config && PROVIDER_MODELS[config.provider]) {
      setProvider(config.provider)
      const modelsForProvider = PROVIDER_MODELS[config.provider] ?? []
      setModel(
        modelsForProvider.includes(config.model) ? config.model : getDefaultModel(config.provider)
      )
    }
  }, [])

  const emptyEditorState: SerializedEditorState = useMemo(
    () => ({
      root: {
        children: [],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    }),
    []
  )

  const editorJson = useMemo(() => {
    return JSON.stringify(editorValue ?? emptyEditorState)
  }, [editorValue, emptyEditorState])

  useEffect(() => {
    if (formState?.status === 'success') {
      if (formState.format === 'html' && formState.html) {
        try {
          setEditorValue(importHtmlToSerializedEditorState(formState.html))
        } catch {
          setEditorValue({
            root: {
              children: [
                {
                  type: 'paragraph',
                  format: '',
                  indent: 0,
                  version: 1,
                  direction: 'ltr',
                  children: [
                    {
                      type: 'text',
                      text: '',
                      format: 0,
                      style: '',
                      mode: 0,
                      detail: 0,
                      direction: 'ltr',
                      indent: 0,
                      version: 1,
                    },
                  ],
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              type: 'root',
              version: 1,
            },
          } as unknown as SerializedEditorState)
        }
        return
      }

      if (formState.editor) {
        setEditorValue(formState.editor as SerializedEditorState)
      }
    }
  }, [formState])

  const handleOnEditorChange = (value: SerializedEditorState) => {
    setEditorValue(value)
  }

  const handleOnPromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptValue(event.target.value)
  }

  const handleOnProviderChange = (value: string) => {
    if (!isProvider(value)) return
    const newProvider = value
    const newModel = getDefaultModel(newProvider)
    setProvider(newProvider)
    setModel(newModel)
    saveChatConfiguration({ provider: newProvider, model: newModel })
  }

  const handleOnModelChange = (value: string) => {
    if (!value) return
    const modelsForProvider = PROVIDER_MODELS[provider] ?? []
    if (!modelsForProvider.includes(value)) return
    setModel(value)
    saveChatConfiguration({ provider, model: value })
  }

  const handleOnKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      formRef.current?.requestSubmit()
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
      <form ref={formRef} className="flex flex-col gap-2 mt-8" action={formAction} noValidate>
        <input type="hidden" name="editor" value={editorJson} />
        <input type="hidden" name="provider" value={provider} />
        <input type="hidden" name="model" value={model} />
        <RichTextField
          onChange={handleOnEditorChange}
          value={editorValue}
          readonly={isPending === true}
          field={{ name: 'editor', label: 'Editor' }}
        />
        <div className="flex flex-col gap-2">
          <TextArea
            label="Prompt"
            id="prompt"
            name="prompt"
            rows={5}
            value={promptValue}
            onChange={handleOnPromptChange}
            onKeyDown={handleOnKeyDown}
            disabled={isPending === true}
            // error={hasErrors('prompt', null, formState?.errors)}
            // errorText={getErrorText('prompt', null, formState?.errors)}
            helpText="Enter your prompt (Cmd/Ctrl + Enter to submit)..."
          />
          <div className="flex options gap-2 items-center">
            <Select
              name="provider"
              value={provider}
              onValueChange={handleOnProviderChange}
              variant="outlined"
            >
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
            </Select>
            <Select
              name="model"
              value={model}
              onValueChange={handleOnModelChange}
              variant="outlined"
            >
              {(PROVIDER_MODELS[provider] ?? []).map((modelOption) => (
                <SelectItem key={modelOption} value={modelOption}>
                  {modelOption}
                </SelectItem>
              ))}
            </Select>
            <Button
              fullWidth={false}
              type="submit"
              disabled={!promptValue.trim() || isPending === true}
            >
              {isPending === true ? <LoaderEllipsis size={30} /> : <span>Submit</span>}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

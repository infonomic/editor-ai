'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'

import { Alert, Button, LoaderEllipsis, Select, SelectItem, TextArea } from '@infonomic/uikit/react'
import type { SerializedEditorState } from 'lexical'

import { MODELS as ANTHROPIC_MODELS } from '@/ai/models/anthropic'
import { MODELS as GOOGLE_MODELS } from '@/ai/models/google'
import { MODELS as OPENAI_MODELS } from '@/ai/models/openai'
import { RichTextField } from '@/ui/fields/richtext-field'
import { executeInstruction } from '../action'
import type { InstructionState } from '../@types'

type Provider = 'openai' | 'google' | 'anthropic'

const PROVIDER_MODELS: Record<Provider, readonly string[]> = {
  openai: OPENAI_MODELS,
  google: GOOGLE_MODELS,
  anthropic: ANTHROPIC_MODELS,
}

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-5.2',
  google: 'gemini-3-pro',
  anthropic: 'claude-sonnet-4-5-20250514',
}

export const EditorChat = () => {
  const initialState: InstructionState = { prompt: '', editor: null, errors: {}, status: 'idle' }
  const [editorValue, setEditorValue] = useState<SerializedEditorState | undefined>(undefined)
  const [provider, setProvider] = useState<Provider>('openai')
  const [model, setModel] = useState<string>(DEFAULT_MODELS.openai)
  const [promptValue, setPromptValue] = useState<string>('')
  const [formState, formAction, isPending] = useActionState(executeInstruction, initialState)
  const formRef = useRef<HTMLFormElement | null>(null)

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
    if (formState?.status === 'success' && formState.editor) {
      setEditorValue(formState.editor as SerializedEditorState)
    }
  }, [formState])

  const handleOnEditorChange = (value: SerializedEditorState) => {
    setEditorValue(value)
  }

  const handleOnPromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptValue(event.target.value)
  }

  const handleOnKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  return (
    <div className="max-w-240 mx-auto">
      {formState?.status === 'success' && (
        <Alert intent="success">
          <span>{formState.message}</span>
        </Alert>
      )}

      {formState?.status === 'failed' && (
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
              onValueChange={(value) => {
                const newProvider = value as Provider
                setProvider(newProvider)
                setModel(DEFAULT_MODELS[newProvider])
              }}
              variant="outlined"
            >
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
            </Select>
            <Select
              name="model"
              value={model}
              onValueChange={(value) => setModel(value)}
              variant="outlined"
            >
              {PROVIDER_MODELS[provider].map((modelOption) => (
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

'use client'

import { useState } from 'react'

import { Button, LoaderEllipsis, TextArea } from '@infonomic/uikit/react'
import type { EditorState, LexicalEditor, SerializedEditorState } from 'lexical'

import { RichTextField } from '@/ui/fields/richtext-field'

export const EditorChat = () => {
  const [editorValue, setEditorValue] = useState<SerializedEditorState | undefined>(undefined)
  const [promptValue, setPromptValue] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const handleOnEditorChange = (value: SerializedEditorState) => {
    setEditorValue(value)
  }

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptValue(event.target.value)
  }

  const handleSubmit = async () => {
    if (!promptValue.trim()) return

    setIsProcessing(true)
    try {
      // TODO: Call AI API with editorValue and promptValue
      // const response = await callAIAPI(editorValue, promptValue)
      // setEditorValue(response)
      console.log('Editor content:', editorValue)
      console.log('Prompt:', promptValue)
    } catch (error) {
      console.error('AI processing failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col gap-2 mt-8 max-w-[960px] mx-auto">
      <RichTextField
        onChange={handleOnEditorChange}
        value={editorValue}
        field={{ name: 'editor', label: 'Editor' }}
      />
      <div className="flex flex-col gap-2">
        <TextArea
          label="Prompt"
          id="input"
          name="input"
          rows={5}
          value={promptValue}
          onChange={handlePromptChange}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          placeholder="Enter your prompt (Cmd/Ctrl + Enter to submit)..."
        />
        <Button
          fullWidth={false}
          type="button"
          onClick={handleSubmit}
          disabled={!promptValue.trim() || isProcessing}
        >
          {isProcessing === true ? <LoaderEllipsis size={30} /> : <span>Submit</span>}
        </Button>
      </div>
    </div>
  )
}

'use client'

import * as React from 'react'
import { useEffect, useMemo } from 'react'

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  createCommand,
  type SerializedEditorState,
} from 'lexical'

import { TextArea } from '../../ui/text-area'

// import { createEmptyEditorState } from './create-empty-editor-state'

import './index.css'

import { mergeRegister } from '@lexical/utils'

export const TOGGLE_AI_DRAWER_COMMAND = createCommand('TOGGLE_AI_DRAWER_COMMAND')

export function AiPlugin(): React.JSX.Element | undefined {
  const [open, setOpen] = React.useState(false)
  const [editor] = useLexicalComposerContext()
  // const emptyEditorState: SerializedEditorState = useMemo(() => createEmptyEditorState(), [])

  function handleOnSave(): void {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(editor.getEditorState()))
  }

  function handleOnClear(): void {
    editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)
    editor.focus()
  }

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

  return (
    <div className={`lexical-ai-plugin ${open ? 'lexical-ai-plugin--visible' : ''}`}>
      <TextArea
        label="AI Assistant"
        placeholder="Ask AI to help you write..."
        value=""
        onChange={() => {}}
      />
      <div className="lexical-ai-plugin__actions">
        <button type="button" onClick={handleOnSave}>
          Save
        </button>
        <button type="button" onClick={handleOnClear}>
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

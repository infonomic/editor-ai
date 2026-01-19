'use client'

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'

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

// import { createEmptyEditorState } from './create-empty-editor-state'

import './index.css'

import { mergeRegister } from '@lexical/utils'

export const TOGGLE_AI_DRAWER_COMMAND = createCommand('TOGGLE_AI_DRAWER_COMMAND')

const AI_PROVIDERS: Array<[string, string]> = [
  ['openai', 'OpenAI'],
  ['google', 'Google'],
  ['anthropic', 'Anthropic'],
]

export function AiPlugin(): React.JSX.Element | undefined {
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

  return (
    <div className={`lexical-ai-plugin ${open ? 'lexical-ai-plugin--visible' : ''}`}>
      <TextArea
        label="AI Assistant"
        placeholder="Ask AI to help you write..."
        value=""
        onChange={() => {}}
      />
      <div className="lexical-ai-plugin__actions">
        <DropDown
          disabled={!isEditable}
          buttonClassName="ai-plugin-button"
          buttonLabel="Provider"
          buttonAriaLabel="Select AI Provider"
        >
          {AI_PROVIDERS.map(([value, name]) => {
            return (
              <DropDownItem
                className="item"
                onClick={() => {
                  console.log(`Selected AI provider: ${value}`)
                }}
                key={value}
              >
                <span className="text">{name}</span>
              </DropDownItem>
            )
          })}
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

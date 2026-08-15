'use client'

import type * as React from 'react'
import { useEffect } from 'react'

import {
  AiPluginLexical as AiPluginLexicalRoot,
  TOGGLE_AI_DRAWER_COMMAND,
} from '@infonomic/ai/plugins/lexical'
import { useToolbarExtensions } from '@infonomic/editor/toolbar-extensions'
import { AiIcon } from '@infonomic/uikit/react'

export function AiPluginLexical(): React.JSX.Element {
  const { register, rootEditor } = useToolbarExtensions()

  useEffect(() => {
    return register({
      id: 'ai-toolbar-button',
      order: 100_001,
      node: (
        <button
          type="button"
          className="toolbar-item spaced"
          onClick={() => {
            rootEditor.dispatchCommand(TOGGLE_AI_DRAWER_COMMAND, undefined)
          }}
        >
          <AiIcon />
        </button>
      ),
    })
  }, [register, rootEditor])

  return <AiPluginLexicalRoot />
}

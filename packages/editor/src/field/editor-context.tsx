'use client'

/**
 * Byline CMS
 *
 * Copyright © 2025 Anthony Bouch and contributors.
 *
 * This file is part of Byline CMS.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import type * as React from 'react'
import { useMemo } from 'react'

import type { InitialConfigType } from '@lexical/react/LexicalComposer'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import type { EditorState, LexicalEditor, SerializedEditorState } from 'lexical'

import { EditorConfigContext } from './config/editor-config-context'
import { SharedHistoryContext } from './context/shared-history-context'
import { SharedOnChangeContext } from './context/shared-on-change-context'
import { Editor } from './editor'
import { Nodes } from './nodes'
import type { EditorConfig } from './config/types'

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function _onError(error: Error, _editor: LexicalEditor): void {
  // eslint-disable-next-line no-console
  console.error(error)
}

export function EditorContext(props: {
  composerKey: string
  editorConfig: EditorConfig
  onChange: (editorState: EditorState, editor: LexicalEditor, tags: Set<string>) => void
  readOnly: boolean
  value?: SerializedEditorState
  children?: React.ReactNode
}): React.JSX.Element {
  const { composerKey, editorConfig, onChange, readOnly, value, children } = props

  // useMemo for the initialConfig that depends on readOnly and value
  // biome-ignore lint/correctness/useExhaustiveDependencies: TODO: revisit
  const initialConfig = useMemo<InitialConfigType>(() => {
    return {
      editable: readOnly !== true,
      editorState: value != null ? JSON.stringify(value) : undefined,
      namespace: editorConfig.lexical.namespace,
      nodes: [...Nodes],
      onError: (error: Error) => {
        throw error
      },
      theme: editorConfig.lexical.theme,
    }
    // Important: do not add readOnly and value to the dependencies array.
    // This will cause the entire lexical editor to re-render if the document
    // is saved, which will cause the editor to lose focus.

    // NOTE: 2025-04-26: This is NOT the case for our version of the editor.
    // Without readOnly as a dependency, the editor will never transition
    // from readOnly to editable during form loading, when disabledFromField
    // in field-component will be briefly false.
  }, [editorConfig, readOnly])

  if (initialConfig == null) {
    return <p>Loading...</p>
  }

  return (
    <LexicalComposer initialConfig={initialConfig} key={composerKey + initialConfig.editable}>
      <EditorConfigContext config={editorConfig.settings}>
        <SharedOnChangeContext onChange={onChange}>
          <SharedHistoryContext>
            <div className="editor-shell">
              <Editor />
            </div>
            {children}
          </SharedHistoryContext>
        </SharedOnChangeContext>
      </EditorConfigContext>
    </LexicalComposer>
  )
}

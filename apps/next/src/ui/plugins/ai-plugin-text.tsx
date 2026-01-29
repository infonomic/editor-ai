'use client'

import { AiPluginText as AiPluginTextRoot } from '@infonomic/ai/plugins/text'
import { Input } from '@infonomic/uikit/react'

export function AiPluginText() {
  return (
    <div className="flex flex-col gap-4">
      <Input
        id="foo"
        name="foo"
        label="Simple Text Input"
        type="text"
        helpText="Enter some text, or enter a prompt below to generate text."
        // onChange={handleOnEditorChange}
        // value={state.editorValue}
        placeholder="Start writing your content here..."
      />
      <AiPluginTextRoot />
    </div>
  )
}
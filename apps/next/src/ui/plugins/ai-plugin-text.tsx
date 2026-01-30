'use client'

import type * as React from 'react'
import { useCallback, useRef, useState } from 'react'

import { AiPluginText as AiPluginTextRoot } from '@infonomic/ai/plugins/text'
import { AiIcon, IconButton, Input } from '@infonomic/uikit/react'

export function AiPluginText() {
  const [inputText, setInputText] = useState('')
  const toggleOpenRef = useRef<(() => void) | null>(null)

  const handleToggleOpen = useCallback(() => {
    toggleOpenRef.current?.()
  }, [])

  const handleOnDrawer = useCallback((drawer: { toggleOpen: () => void }) => {
    toggleOpenRef.current = drawer.toggleOpen
  }, [])

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(event.target.value)
  }, [])

  const handleApplyResult = useCallback((nextText: string) => {
    setInputText(nextText)
  }, [])

  const handleClearInput = useCallback(() => {
    setInputText('')
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <IconButton onClick={handleToggleOpen} variant='text' size="md" className='w-[28px] h-[28px] max-w-[28px] max-h-[28px] min-w-[28px] min-h-[28px] '>
        <AiIcon />
      </IconButton>
      <Input
        id="foo"
        name="foo"
        label="Simple Text Input"
        type="text"
        onChange={handleInputChange}
        value={inputText}
        helpText="Enter some text, or enter a prompt below to generate text."
        placeholder="Start writing your content here..."
      />
      <AiPluginTextRoot
        inputText={inputText}
        onApplyResult={handleApplyResult}
        onClearInput={handleClearInput}
        onDrawer={handleOnDrawer}
      />
    </div>
  )
}

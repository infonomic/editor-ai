import Link from 'next/link'

import { AiPluginText } from '@infonomic/ai/plugins/text'
import { Container, Input, Section } from '@infonomic/uikit/react'

export default async function TextPage() {
  return (
    <main>
      <Section>
        <Container className="max-w-[960px] mx-auto">
          <Link className="underline" href="/">
            Home
          </Link>
          <div className="prose">
            <h1>Text AI Demo</h1>
          </div>
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
            <AiPluginText />
          </div>
        </Container>
      </Section>
    </main>
  )
}

import Link from 'next/link'

import { Container, Section } from '@infonomic/uikit/react'

import { AiPluginText } from '@/ui/plugins/ai-plugin-text'

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
            <AiPluginText />
          </div>
        </Container>
      </Section>
    </main>
  )
}

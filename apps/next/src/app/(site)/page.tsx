import Link from 'next/link'

import { Container, Section } from '@infonomic/uikit/react'

import { RichTextField } from '@/ui/fields/richtext-field'

const Page = () => {
  return (
    <main>
      <Section>
        <Container>
          <div className="prose">
            <h1>Welcome to Infonomic's Editor</h1>
          </div>
          <RichTextField field={{ name: 'editor1', label: 'Example Editor' }} />
        </Container>
      </Section>
    </main>
  )
}

export default Page

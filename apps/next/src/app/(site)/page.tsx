import { Container, Section, TextArea } from '@infonomic/uikit/react'

import { EditorChat } from '@/ui/components/editor-chat'

const Page = () => {
  return (
    <main>
      <Section>
        <Container>
          <div className="prose">
            <h1>Welcome to Infonomic's Editor</h1>
          </div>
          <EditorChat />
        </Container>
      </Section>
    </main>
  )
}

export default Page

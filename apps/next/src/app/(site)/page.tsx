import { Container, Section, TextArea } from '@infonomic/uikit/react'

import { EditorChat } from '@/modules/editor-chat/components/editor-chat'

const Page = () => {
  return (
    <main>
      <Section>
        <Container className="max-w-[960px] mx-auto">
          <div className="prose">
            <h1>Make Shit Happen</h1>
          </div>
          <EditorChat />
        </Container>
      </Section>
    </main>
  )
}

export default Page

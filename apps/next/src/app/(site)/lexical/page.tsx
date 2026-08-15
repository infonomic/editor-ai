import Link from 'next/link'

import { Container, Section } from '@infonomic/uikit/react'

import { RichTextField } from '@/ui/fields/richtext-field'
import { AiPluginLexical } from '@/ui/plugins/ai-plugin-lexical'

export default async function LexicalPage() {
  return (
    <main>
      <Section>
        <Container className="max-w-[960px] mx-auto">
          <Link className="underline" href="/">
            Home
          </Link>
          <div className="prose">
            <h1>Lexical AI Demo</h1>
          </div>
          <RichTextField
            // onChange={handleOnEditorChange}
            // value={state.editorValue}
            editorSettings={{
              inlineImageUploadCollection: '',
              placeholderText: 'Start writing your content here...',
            }}
            minHeight={'250px'}
            maxHeight={'475px'}
            // readonly={isPending === true}
            field={{ name: 'editor', label: 'Editor' }}
            featureAfterEditor={[<AiPluginLexical key="ai-feature" />]}
          />
        </Container>
      </Section>
    </main>
  )
}

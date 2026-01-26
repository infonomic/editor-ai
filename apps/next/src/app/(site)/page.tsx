import { Container, Section } from '@infonomic/uikit/react'

import { RichTextField } from '@/ui/fields/richtext-field'
import { AiFeature } from '@/ui/plugin/ai-feature'

const Page = () => {
  return (
    <main>
      <Section>
        <Container className="max-w-[960px] mx-auto">
          <div className="prose">
            <h1>Make Stuff Happen</h1>
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
            featureAfterEditor={[<AiFeature key="ai-feature" />]}
          />
          {/* <EditorChat /> */}
        </Container>
      </Section>
    </main>
  )
}

export default Page

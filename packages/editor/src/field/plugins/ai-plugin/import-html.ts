import { $generateNodesFromDOM } from '@lexical/html'
import type { SerializedEditorState } from 'lexical'
import { $createParagraphNode, $createTextNode, $getRoot, createEditor } from 'lexical'

import { defaultEditorConfig } from '../../config/default'
import { Nodes } from '../../nodes'

export const importHtmlToSerializedEditorState = (html: string): SerializedEditorState => {
  const parser = new DOMParser()
  const dom = parser.parseFromString(html, 'text/html')

  const editor = createEditor({
    namespace: defaultEditorConfig.lexical.namespace,
    nodes: [...Nodes],
    theme: defaultEditorConfig.lexical.theme,
    onError(error) {
      throw error
    },
  })

  // Ensure the editor is fully initialized for DOM-based transforms.
  editor.setRootElement(document.createElement('div'))

  editor.update(
    () => {
      const nodes = $generateNodesFromDOM(editor, dom)
      const root = $getRoot()
      root.clear()

      if (nodes.length > 0) {
        root.append(...nodes)
        return
      }

      // Never allow an empty root state; fallback to plain text.
      const text = dom.body?.textContent?.trim() ?? ''
      const paragraph = $createParagraphNode()
      if (text.length > 0) {
        paragraph.append($createTextNode(text))
      }
      root.append(paragraph)
    },
    { discrete: true }
  )

  return editor.getEditorState().toJSON()
}

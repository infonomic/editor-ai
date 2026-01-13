# AI Editor Chat Implementation

## Overview
This module implements an AI-powered rich text editor with formatting preservation using a **patch-based text-node editing strategy**. The implementation uses the Vercel AI SDK for reliable structured outputs and OpenAI's `gpt-4o-mini` model.

## Architecture

### Strategy: Patch-Based Text Node Editing
Instead of regenerating the entire Lexical JSON document (which is token-expensive and risks breaking formatting), we:
1. Extract all `type: "text"` nodes from the Lexical state with their paths
2. Send only the text strings to the AI model
3. Receive back a JSON array of `{id, text}` edits
4. Apply the edits back onto the original Lexical JSON, preserving all formatting nodes

**Benefits:**
- ✅ **Low token cost**: Only sends/receives text strings, not entire document structure
- ✅ **Formatting preservation**: Headings, lists, quotes, bold/italic all remain intact
- ✅ **Rate limit friendly**: Minimal output tokens reduce API quota pressure
- ✅ **Reliable**: AI SDK's structured outputs guarantee valid JSON schema

**Trade-offs:**
- ⚠️ Cannot add new structural elements (e.g., "make this a list") without schema extension
- ⚠️ Future: Extend schema to support `insertNode`, `deleteNode`, `setFormat` operations

## Key Files

### `action.ts` - Server Action
**Responsibilities:**
- Validates form input (prompt + editor state)
- Extracts text nodes from Lexical JSON
- Calls OpenAI via Vercel AI SDK `generateObject`
- Applies returned edits back to editor state
- Returns updated state to client

**Key Functions:**
- `executeInstruction()` - Main server action (useActionState)
- `ensureNonEmptyLexicalDocument()` - Ensures editor has at least one paragraph+text node
- `buildSystemPrompt()` - Instructs model to preserve formatting and return exact node count
- `buildUserPrompt()` - Passes user instruction + text nodes to model
- `extractTextNodesFromLexicalState()` - Recursively walks Lexical JSON to find text nodes
- `setAtPath()` - Applies edits back to original JSON structure

**Model Configuration:**
- Model: `gpt-4o-mini` (cost-effective, fast, supports structured outputs)
- Temperature: `0.2` (deterministic, minimal hallucination)
- Schema: `lexicalTextEditsResponseSchema` (Zod → JSON Schema)

### `lexicalTextEdits.ts` - Utilities
**Exports:**
- `lexicalTextEditsResponseSchema` - Zod schema for AI response validation
- `extractTextNodesFromLexicalState()` - Walks Lexical JSON tree, extracts text nodes
- `setAtPath()` - Updates nested JSON values by path array

**Type Definitions:**
```typescript
type ExtractedTextNode = {
  id: number              // Sequential ID for this edit session
  path: (string|number)[] // JSONPath to the text field (e.g., ["root","children",0,"children",1,"text"])
  text: string            // Current text value
}

type LexicalTextEditsResponse = {
  edits: Array<{
    id: number   // Must match input node ID
    text: string // Updated text value
  }>
}
```

### `editor-chat.tsx` - Client Component
**Responsibilities:**
- Manages editor state and prompt input
- Submits form to server action via `useActionState`
- Applies returned editor state back to the editor

**Key Hooks:**
- `useActionState(executeInstruction)` - React 19 server action integration
- `useEffect()` - Applies success state back into editor
- `useMemo()` - Serializes editor state to JSON for form submission

**Form Flow:**
1. User types prompt + edits content
2. Form submit → `formAction(FormData)`
3. Server processes → returns `InstructionState`
4. `useEffect` detects `status: 'success'` → `setEditorValue(formState.editor)`

## AI SDK Integration

### Why Vercel AI SDK?
- **Structured Outputs**: `generateObject()` enforces Zod schema via OpenAI's `response_format: { type: 'json_schema' }`
- **Type Safety**: Returned `object` is typed from Zod schema (no manual parsing)
- **Error Handling**: AI SDK throws specific errors (rate limit, invalid JSON, etc.)
- **Code Simplification**: Eliminates ~50 lines of manual JSON parsing/validation

### Migration from Raw OpenAI Client
**Before (Raw OpenAI):**
```typescript
const openai = new OpenAI({ apiKey, baseURL })
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
})
const content = completion.choices?.[0]?.message?.content
const parsed = safeParseJsonObject(content) // Manual parsing
const validated = lexicalTextEditsResponseSchema.safeParse(parsed) // Manual validation
if (!validated.success) { /* error handling */ }
const edits = validated.data.edits
```

**After (AI SDK):**
```typescript
import { openai } from '@/ai/models/openai/openai' // Vercel AI SDK provider
const { object: data } = await generateObject({
  model: openai('gpt-4o-mini'),
  system: buildSystemPrompt(),
  prompt: buildUserPrompt(prompt, inputTextNodes),
  schema: lexicalTextEditsResponseSchema, // AI SDK enforces this
  temperature: 0.2,
})
const edits = data.edits // Typed automatically
```

## Testing the Prototype

### Use Cases
1. **Translation**: "Translate to Spanish" → preserves headings/lists
2. **Rephrasing**: "Make this more formal" → preserves structure
3. **Expansion**: "Add more detail" → extends text in-place
4. **Empty Editor**: "Write a short intro about X" → generates minimal paragraph

### Error Handling
- ✅ Missing API key → friendly error message
- ✅ Invalid editor JSON → validation error
- ✅ No text nodes → user-friendly message
- ✅ Document too large (>400 nodes) → prototype guardrail
- ✅ AI returns wrong count/IDs → validation error

### Rate Limits
If you hit OpenAI rate limits (429 error):
1. Ensure `OPENAI_API_KEY` is valid and has quota
2. Reduce document size (< 400 text nodes for prototype)
3. Wait a few minutes for rate limit window to reset
4. Consider upgrading to a paid OpenAI plan with higher TPM/RPM

## Future Enhancements

### 1. Extended Patch Operations
Support structural changes with expanded schema:
```typescript
type LexicalOperation = 
  | { op: 'updateText', id: number, text: string }
  | { op: 'setFormat', id: number, format: number } // bold/italic
  | { op: 'insertNode', afterId: number, node: SerializedLexicalNode }
  | { op: 'deleteNode', id: number }
```

### 2. Multi-Provider Support
Abstract provider selection:
```typescript
const provider = config.ai.defaultProvider === 'openai' 
  ? openai(model)
  : config.ai.defaultProvider === 'anthropic'
  ? anthropic(model)
  : google(model)
```

### 3. Ajv Schema Validation
Validate final editor state against Lexical JSON schema before returning:
```typescript
import Ajv from 'ajv'
import { documentSchema } from '@/ai/schemas/lexicalJsonSchema'

const ajv = new Ajv()
const validate = ajv.compile(documentSchema)
if (!validate(editorState)) {
  return { status: 'failed', message: 'AI generated invalid Lexical state' }
}
```

### 4. Prompt Templates
Integrate existing prompt library (`@/ai/prompts.ts`):
```typescript
import { defaultPrompts } from '@/ai/prompts'
const translatePrompt = defaultPrompts.find(p => p.name === 'Translate')
const systemPrompt = translatePrompt.system({ locale: 'es' })
```

## Configuration

### Environment Variables (.env)
```bash
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional: for Azure/custom endpoints
AI_DEFAULT_PROVIDER=openai
```

### Model Selection
Hardcoded in `action.ts`:
```typescript
const model = 'gpt-4o-mini' // Change to 'gpt-4o' for higher quality (more expensive)
```

Future: Make configurable via UI or server config.

## Dependencies
- `ai` - Vercel AI SDK (`generateObject`)
- `@ai-sdk/openai` - OpenAI provider
- `openai` - OpenAI TypeScript SDK (used for images/voice)
- `zod` - Schema validation
- `lexical` - Editor types

## Performance Considerations
- **Token Usage**: ~50-200 tokens per request (varies by document size)
- **Latency**: ~500-2000ms per request (depends on model and text node count)
- **Cost**: `gpt-4o-mini` is ~$0.15/1M input tokens, ~$0.60/1M output tokens
- **Rate Limits**: Free tier: 200 RPM, 40K TPM. Paid tier: higher (varies by plan).

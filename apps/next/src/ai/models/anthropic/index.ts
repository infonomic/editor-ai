export const MODEL_KEY = 'ANTH-C'
export const MODELS = [
  'claude-opus-4-5-20250710',
  'claude-sonnet-4-5-20250514',
  'claude-haiku-4-5-20250710',
  'claude-opus-4-20250414',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-latest',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
] as const

export type AnthropicModel = (typeof MODELS)[number]

export const DEFAULT_MODEL: AnthropicModel = 'claude-sonnet-4-5-20250514'

// export const AnthropicConfig: GenerationConfig = {
//   models: [
//     {
//       id: `${MODEL_KEY}-text`,
//       name: 'Anthropic Claude',
//       fields: ['text', 'textarea'],
//       handler: (
//         prompt: string,
//         options: {
//           extractAttachments?: boolean
//           locale?: string
//           maxTokens?: number
//           model: string
//           schema?: Record<string, any>
//           system?: string
//           temperature?: number
//         }
//       ) => {
//         return generateObject(
//           prompt,
//           {
//             ...options,
//             system: options.system || defaultSystemPrompt,
//           },
//           anthropic(options.model)
//         )
//       },
//       output: 'text',
//       settings: {
//         name: `${MODEL_KEY}-text-settings`,
//         type: 'group',
//         admin: {
//           condition(data) {
//             return data['model-id'] === `${MODEL_KEY}-text`
//           },
//         },
//         fields: [
//           {
//             name: 'model',
//             type: 'select',
//             defaultValue: 'claude-3-5-sonnet-latest',
//             label: 'Model',
//             options: MODELS,
//           },
//           {
//             type: 'row',
//             fields: [
//               {
//                 name: 'maxTokens',
//                 type: 'number',
//                 defaultValue: 5000,
//               },
//               {
//                 name: 'temperature',
//                 type: 'number',
//                 defaultValue: 0.7,
//                 max: 1,
//                 min: 0,
//               },
//             ],
//           },
//           {
//             name: 'extractAttachments',
//             type: 'checkbox',
//           },
//         ],
//         label: 'Anthropic Claude Settings',
//       },
//     },
//     {
//       id: `${MODEL_KEY}-object`,
//       name: 'Anthropic Claude',
//       fields: ['richText'],
//       handler: (text: string, options) => {
//         return generateObject(
//           text,
//           {
//             ...options,
//             system: options.system || defaultSystemPrompt,
//           },
//           anthropic(options.model)
//         )
//       },
//       output: 'text',
//       settings: {
//         name: `${MODEL_KEY}-object-settings`,
//         type: 'group',
//         admin: {
//           condition(data) {
//             return data['model-id'] === `${MODEL_KEY}-object`
//           },
//         },
//         fields: [
//           {
//             name: 'model',
//             type: 'select',
//             defaultValue: 'claude-3-5-sonnet-latest',
//             label: 'Model',
//             options: MODELS,
//           },
//           {
//             type: 'row',
//             fields: [
//               {
//                 name: 'maxTokens',
//                 type: 'number',
//                 defaultValue: 5000,
//               },
//               {
//                 name: 'temperature',
//                 type: 'number',
//                 defaultValue: 0.7,
//                 max: 1,
//                 min: 0,
//               },
//             ],
//           },
//           {
//             name: 'extractAttachments',
//             type: 'checkbox',
//           },
//         ],
//         label: 'Anthropic Claude Settings',
//       },
//     },
//   ],
//   provider: 'Anthropic',
// }

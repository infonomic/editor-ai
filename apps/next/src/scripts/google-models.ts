import { GoogleGenAI } from '@google/genai'

import { getServerConfig } from '@/config'

// This script lists all available Google Generative AI models along with their descriptions.
// From apps/next run: tsx --env-file=.env src/scripts/google-models.ts
// Requires GEMINI_API_KEY obtained from https://console.cloud.google.com/apis/credentials or
// https://aistudio.google.com/u/2/api-key

// Make sure your GEMINI_API_KEY environment variable is set
const ai = new GoogleGenAI({ apiKey: getServerConfig().ai.google.apiKey })

async function listAllModels() {
  console.log('Listing available models...')
  try {
    const modelsPager = await ai.models.list()

    // Iterate through the models using the Pager
    for await (const model of modelsPager) {
      console.log(`Model Name: ${model.name}`)
      console.log(`Description: ${model.description}`)
      console.log(
        `Supports generateContent: ${model?.supportedActions?.includes('generateContent')}`
      )
      console.log('---')
    }
  } catch (error) {
    console.error('Failed to list models:', error)
  }
}

listAllModels()

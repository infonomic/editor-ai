import Anthropic from '@anthropic-ai/sdk'

import { getAiServerConfig } from '@/config'

// This script lists all available Anthropic models along with their descriptions.
// From apps/next run: tsx --env-file=.env src/scripts/anthropic-models.ts
// Requires anthropic API key obtained from https://console.anthropic.com/api-keys

const isValidHttpUrl = (value: string | undefined): value is string => {
  if (value == null || value.trim().length === 0) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const config = getAiServerConfig()
const baseURL = isValidHttpUrl(config.ai.anthropic.baseUrl)
  ? config.ai.anthropic.baseUrl
  : 'https://api.anthropic.com'

// Make sure your ANTHROPIC_API_KEY environment variable is set
const client = new Anthropic({
  apiKey: config.ai.anthropic.apiKey,
  // Explicitly set baseURL so we don't accidentally pick up an invalid
  // ANTHROPIC_BASE_URL from the environment (e.g. a placeholder value).
  baseURL,
})

async function listAllModels() {
  console.log('Listing available models...')
  try {
    const modelsPager = await client.models.list()

    // Iterate through the models using the Pager
    for await (const model of modelsPager) {
      console.log(`Model Name: ${model.display_name}`)
      console.log(`Description: ${model.created_at}`)
      console.log(`ID: ${model.id}`)
      console.log(`Type: ${model.type}`)
      console.log('---')
    }
  } catch (error) {
    console.error('Failed to list models:', error)
  }
}

listAllModels()

import OpenAI from 'openai'

import { getAiServerConfig as getServerConfig } from '../../config/ai-config'

// This script lists all available OpenAI models along with their descriptions.
// From apps/next run: tsx --env-file=.env src/scripts/openai-models.ts
// Requires OPENAI_API_KEY obtained from https://platform.openai.com/api-keys

const openai = new OpenAI({ apiKey: getServerConfig().ai.openai.apiKey })

async function main() {
  const list = await openai.models.list()

  for await (const model of list) {
    console.log(model)
  }
}
main()

import { booleanSchema, requireIfEnabled, urlSchema } from '@infonomic/schemas'
import { z } from 'zod'

/**
 * Server configuration schema and functions. Note that these
 * values are ONLY available on the server and NOT available
 * at build time and therefore not available to the browser.
 * Values here are populated via the projects's .env file
 * which is NOT committed to the project's Git repo and
 * CAN include secrets.
 */
const serverSchema = z.object({
  ai: z.object({
    defaultProvider: z.enum(['openai', 'google', 'anthropic']),
    openai: z.object({
      apiKey: z.string(),
    }),
    google: z.object({
      apiKey: z.string(),
    }),
    anthropic: z.object({
      apiKey: z.string(),
    }),
  }),
})

type ServerConfig = z.infer<typeof serverSchema>

const initServerConfig = (): ServerConfig =>
  serverSchema.parse({
    ai: {
      defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'openai',
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
      },
      google: {
        apiKey: process.env.GOOGLE_API_KEY || '',
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
      },
    },
    log: {
      level: process.env.LOG_LEVEL ?? 'info',
      pretty: process.env.LOG_PRETTY,
    },
  })

let cachedServerConfig: ServerConfig

export const getServerConfig = (): ServerConfig => {
  if (cachedServerConfig == null) {
    cachedServerConfig = initServerConfig()
  }
  return cachedServerConfig
}

/**
 * Public configuration schema and functions. Note that these
 * values are populated via .env.public and NEXT_PUBLIC_... vars
 * which are available at 'build time', and are compiled into
 * the Next.js client application - and therefore shipped to
 * the browser. .env.public is also committed to the project's
 * Git repo - and so it's essential that these values
 * DO NOT contain secrets.
 */
const publicSchema = z.object({})

export type PublicConfig = z.infer<typeof publicSchema>

// const initPublicConfig = () =>
//   publicSchema.parse({
//     // siteName: process.env.NEXT_PUBLIC_SITE_NAME,
//     // siteDescription: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
//     // publicServerUrl: process.env.NEXT_PUBLIC_PUBLIC_SERVER_URL,
//     // apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
//     // cspEnabled: process.env.NEXT_PUBLIC_CSP_ENABLED,
//     // recaptcha: {
//     //   enabled: process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED,
//     //   mandatory: process.env.NEXT_PUBLIC_RECAPTCHA_MANDATORY,
//     //   siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
//     // },
//   })

// let cachedPublicConfig: PublicConfig

// export const getPublicConfig = (): PublicConfig => {
//   if (cachedPublicConfig == null) {
//     cachedPublicConfig = initPublicConfig()
//   }
//   return cachedPublicConfig
// }

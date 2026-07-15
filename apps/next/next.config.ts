import crypto from 'node:crypto'
import { resolve } from 'node:path'

import { config } from 'dotenv'
import type { NextConfig } from 'next'

// https://www.sherpa.sh/blog/secrets-of-self-hosting-nextjs-at-scale-in-2025
const key = crypto.randomBytes(32)
// console.log(key.toString('hex'))
process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY = key.toString('hex')

// Disable dotenv tips/messages
process.env.DOTENV_CONFIG_QUIET = 'true'

// Load .env.public first, then .env (so that .env can override)
config({ path: resolve(process.cwd(), '.env.public') })
config({ path: resolve(process.cwd(), '.env') })

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.infonomic.io',
        pathname: '/**',
      },
    ],
  },
  reactCompiler: true,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
}

export default nextConfig

'use client'

import { createContext, type ReactNode, useContext } from 'react'

import type { AiPublicConfig } from './index'

export const PublicConfigContext = createContext<AiPublicConfig | undefined>(undefined)

export const PublicConfigProvider = ({
  config,
  children,
}: {
  config: AiPublicConfig
  children: ReactNode
}) => {
  return <PublicConfigContext.Provider value={config}>{children}</PublicConfigContext.Provider>
}

export const usePublicConfig = () => {
  const context = useContext(PublicConfigContext)
  if (context != null) {
    return context
  }
  throw new Error('usePublicConfig must be used within a PublicConfigProvider')
}

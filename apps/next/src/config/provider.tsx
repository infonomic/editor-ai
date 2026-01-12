'use client'

import { createContext, type ReactNode, useContext } from 'react'

import type { PublicConfig } from './index'

export const PublicConfigContext = createContext<PublicConfig | undefined>(undefined)

export const PublicConfigProvider = ({
  config,
  children,
}: {
  config: PublicConfig
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

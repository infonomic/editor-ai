import type React from 'react'

import '@/ui/styles/global.css'

type RootLayoutProps = Readonly<{
  children: React.ReactNode
}>

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html className="dark scroll-smooth" lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  )
}

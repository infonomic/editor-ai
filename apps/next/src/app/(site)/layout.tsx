import type React from 'react'

import '@/ui/styles/global.css'

export default function RootLayout({ children }: LayoutProps<'/'>): React.JSX.Element {
  return (
    <html className="dark scroll-smooth" lang="en" data-theme="dark">
      <body className="bg-white dark:bg-canvas-900">{children}</body>
    </html>
  )
}

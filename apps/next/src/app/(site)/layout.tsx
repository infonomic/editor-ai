import type React from 'react'

import 'src/ui/styles/globals.css'

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <html className="dark scroll-smooth" lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  )
}

export default Layout

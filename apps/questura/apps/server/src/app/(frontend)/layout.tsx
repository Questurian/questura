import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Questura API',
  title: 'Questura API',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}

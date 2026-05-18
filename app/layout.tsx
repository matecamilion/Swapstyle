import type { Metadata } from 'next'
import { Bebas_Neue, Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toaster } from '@/components/ui/sonner'
import { AIChatWidget } from '@/components/chat/AIChatWidget'
import { getSession } from '@/lib/session'

// next/font injects @font-face rules and sets CSS variables on <html>
const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--nf-bebas',
  display: 'swap',
})

const barlowCondensed = Barlow_Condensed({
  weight: ['400', '600', '700', '900'],
  subsets: ['latin'],
  variable: '--nf-barlow-cond',
  display: 'swap',
})

const barlow = Barlow({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--nf-barlow',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Swapstyle',
  description: 'Sistema de gestión para local de ropa en consignación',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const authenticated = session.isLoggedIn

  return (
    <html
      lang="es"
      className={`h-full ${bebasNeue.variable} ${barlowCondensed.variable} ${barlow.variable}`}
    >
      <body className="h-full antialiased">
        {authenticated && <Sidebar />}
        <main className={authenticated ? 'ml-60 min-h-screen p-8' : 'min-h-screen'}>
          {children}
        </main>
        <Toaster richColors position="top-right" />
        {authenticated && <AIChatWidget />}
      </body>
    </html>
  )
}

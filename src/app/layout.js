import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import Nav from "@/components/web/Nav"
import Footer from '@/components/web/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Starboard - Accelerator Program Management',
  description: 'Comprehensive platform for managing accelerator programs, startups, and mentors',
  keywords: 'accelerator, startups, mentorship, program management',
  authors: [{ name: 'Starboard Team' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3E3EFF',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`}>
       
        <Providers>
          <div className="min-h-full bg-snow-100">{children}</div>
          
        </Providers>
    
      </body>
    </html>
  )
}

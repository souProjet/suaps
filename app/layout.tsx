import './globals.css'
import { Inter } from 'next/font/google'
import React from 'react'
import CacheManager from '@/components/CacheManager'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Planificateur SUAPS - Université de Nantes',
  description: 'Planificateur intelligent pour trouver des créneaux compatibles entre différentes activités sportives du SUAPS. Sauvegarde automatique de vos préférences.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <CacheManager />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {children}
        </div>
      </body>
    </html>
  )
} 
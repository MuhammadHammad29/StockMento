import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://stockmento.com'

export const metadata: Metadata = {
  title: 'Labs | StockMento',
  description:
    'Complete hands-on labs and exercises to practice your PSX trading skills. Learn through real historical scenarios and market conditions.',
  alternates: {
    canonical: `${SITE_URL}/labs`,
  },
  // Labs are interactive learning tools requiring authentication
  // Not meant for search engine indexing
  robots: {
    index: false,
    follow: false,
  },
}

export default function LabsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

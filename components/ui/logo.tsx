import Image from "next/image"

interface LogoProps {
  variant?: 'default' | 'white'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Logo({ variant = 'white', size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: { width: 100, height: 25 },   // Smaller for mobile
    md: { width: 150, height: 38 },   // Original medium size
    lg: { width: 180, height: 45 }    // Original large size
  }
  
  const logoSrc = '/logo/StockMento logo-transparent_copy.png'
  
  return (
    <Image 
      src={logoSrc}
      alt="StockMento"
      width={sizes[size].width}
      height={sizes[size].height}
      className={`object-contain ${className}`}
      priority
    />
  )
}
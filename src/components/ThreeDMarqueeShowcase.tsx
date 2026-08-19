'use client'

import { ThreeDMarquee } from '@/components/ui/3d-marquee'

export default function ThreeDMarqueeShowcase({ images, className }: { images: string[]; className?: string }) {
  return <ThreeDMarquee images={images} className={className} />
}

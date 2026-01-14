import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import Spinner from './ui/spinner'

interface OptimizedVideoProps {
  src: string
  poster?: string
  className?: string
  containerClassName?: string
}

export function OptimizedVideo({ src, poster, className, containerClassName }: OptimizedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Intersection Observer for lazy loading
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '200px',
        threshold: 0,
      },
    )

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  // Load and play video when in view
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isInView) return

    const handleLoaded = () => {
      setIsLoaded(true)
      video.play().catch(() => {
        // Autoplay blocked, still show the video
        setIsLoaded(true)
      })
    }

    // Listen for multiple events to catch when video is ready
    video.addEventListener('canplaythrough', handleLoaded)
    video.addEventListener('loadeddata', handleLoaded)

    // Set src and start loading
    video.src = src
    video.load()

    return () => {
      video.removeEventListener('canplaythrough', handleLoaded)
      video.removeEventListener('loadeddata', handleLoaded)
    }
  }, [isInView, src])

  return (
    <div ref={containerRef} className={cn('relative bg-muted', containerClassName)}>
      {/* Loading state */}
      {!isLoaded && (
        <div className='absolute inset-0 flex items-center justify-center bg-muted'>
          <div className='flex flex-col items-center gap-3 text-muted-foreground'>
            <Spinner />
            <span className='text-sm'>Loading video...</span>
          </div>
        </div>
      )}

      {/* Video element - src set dynamically when in view */}
      <video ref={videoRef} className={cn('w-full transition-opacity duration-300', isLoaded ? 'opacity-100' : 'opacity-0', className)} loop muted playsInline poster={poster} />
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

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
  const [hasStartedLoading, setHasStartedLoading] = useState(false)

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
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0,
      }
    )

    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  // Start loading video when in view
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isInView || hasStartedLoading) return

    setHasStartedLoading(true)

    // Change preload to auto to start downloading
    video.preload = 'auto'

    // Try to play once enough data is buffered
    const handleCanPlay = () => {
      setIsLoaded(true)
      video.play().catch(() => {
        // Autoplay might be blocked, that's okay
        setIsLoaded(true)
      })
    }

    video.addEventListener('canplay', handleCanPlay)

    // Also handle if video is already ready
    if (video.readyState >= 3) {
      handleCanPlay()
    }

    return () => {
      video.removeEventListener('canplay', handleCanPlay)
    }
  }, [isInView, hasStartedLoading])

  return (
    <div ref={containerRef} className={cn('relative bg-muted', containerClassName)}>
      {/* Loading skeleton */}
      {!isLoaded && (
        <div className='absolute inset-0 flex items-center justify-center bg-muted animate-pulse'>
          <div className='flex flex-col items-center gap-2 text-muted-foreground'>
            <svg
              className='h-8 w-8 animate-spin'
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
            >
              <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
              <path
                className='opacity-75'
                fill='currentColor'
                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
              />
            </svg>
            <span className='text-sm'>Loading video...</span>
          </div>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        className={cn('w-full transition-opacity duration-300', isLoaded ? 'opacity-100' : 'opacity-0', className)}
        autoPlay
        loop
        muted
        playsInline
        preload='none' // Start with none, upgrade to auto when in view
        poster={poster}
      >
        <source src={src} type='video/mp4' />
      </video>
    </div>
  )
}

import { handle } from '@upstash/realtime'
import { realtime } from '@/lib/realtime'
import { createFileRoute } from '@tanstack/react-router'

// Match timeout to realtime config
export const maxDuration = 300

const realtimeHandler = handle({ realtime })

export const Route = createFileRoute('/api/realtime')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const response = await realtimeHandler(request)
        return response ?? new Response('No response', { status: 500 })
      },
    },
  },
})

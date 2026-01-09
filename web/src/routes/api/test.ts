import { realtime } from '@/lib/realtime'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/test')({
  server: {
    handlers: {
      GET: async () => {
        await realtime.emit('messages.content', 'Hello Mom, i love you!')
        return Response.json({ message: 'event has been emitted' })
      },
    },
  },
})

import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { waitlistClient } from 'better-auth-waitlist'
import { auth } from './auth'

export const authClient = createAuthClient({
  plugins: [waitlistClient(), inferAdditionalFields<typeof auth>()],
})

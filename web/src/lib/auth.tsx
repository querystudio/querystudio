import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { waitlist } from 'better-auth-waitlist'
import { db } from 'drizzle'
import { zeroId } from 'zero-id'
import { emailer } from './emailer'
import { env } from './env'
import { render } from '@react-email/render'
import VerifyEmail from '@/emails/verify-email'
import WaitlistJoined from '@/emails/waitlist-joined'
import WaitlistStatus from '@/emails/waitlist-status'

const ADMIN_EMAILS = ['vestergaardlasse2@gmail.com']

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  user: {
    additionalFields: {
      polarCustomerId: {
        type: 'string',
        required: false,
      },
      isPro: {
        type: 'boolean',
        required: false,
      },
      licenseKey: {
        type: 'string',
        required: false,
      },
      cancelAtPeriodEnd: {
        type: 'boolean',
        required: false,
      },
    },
  },
  advanced: {
    database: {
      generateId: () => zeroId({ randomLength: 32, prefix: 'user_' }),
    },
  },
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  emailVerification: {
    sendVerificationEmail: async (data) => {
      await emailer.emails.send({
        from: env.USESEND_FROM,
        to: data.user.email,
        subject: 'QueryStudio - Verify your email',
        html: await render(<VerifyEmail url={data.url} />),
      })
    },
    autoSignInAfterVerification: true,
  },
  plugins: [
    waitlist({
      enabled: true,
      onJoinRequest: async ({ request }) => {
        await emailer.emails.send({
          from: env.USESEND_FROM,
          to: request.email,
          subject: "You're on the QueryStudio waitlist!",
          html: await render(<WaitlistJoined />),
        })
      },
      onStatusChange: async (entry) => {
        if (entry.status === 'accepted' || entry.status === 'rejected') {
          await emailer.emails.send({
            from: env.USESEND_FROM,
            to: entry.email,
            subject: entry.status === 'accepted' ? "You've been approved for QueryStudio!" : 'Update on your QueryStudio waitlist request',
            html: await render(<WaitlistStatus status={entry.status === 'accepted' ? 'approved' : 'rejected'} />),
          })
        }
      },
      canManageWaitlist: async (user) => {
        return ADMIN_EMAILS.includes(user.email)
      },
    }),
  ],
})

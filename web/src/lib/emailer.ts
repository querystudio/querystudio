import { UseSend } from 'usesend-js'
import { env } from '@/lib/env'

export const emailer = new UseSend(env.USESEND_API_KEY)

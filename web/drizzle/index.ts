import { env } from '@/lib/env'
import { drizzle } from 'drizzle-orm/bun-sql'

import * as authSchema from './schema/auth'

export const db = drizzle(env.DATABASE_URL, { schema: { ...authSchema } })

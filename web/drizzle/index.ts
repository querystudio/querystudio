import { env } from '@/lib/env'
import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as authSchema from './schema/auth'
import * as deviceSchema from './schema/device'

// This MUST be set for PlanetScale Postgres connections
neonConfig.fetchEndpoint = (host) => `https://${host}/sql`
const sql = neon(env.DATABASE_URL)

export const db = drizzle(sql, { schema: { ...authSchema, ...deviceSchema } })

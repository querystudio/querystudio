import { env } from '@/lib/env'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: 'drizzle/schema',
  out: 'drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: env.DATABASE_DIRECT_URL },
  tablesFilter: ['querystudio_*'],
})

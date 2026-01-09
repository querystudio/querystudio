import { z } from 'zod/v4'

const envSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_DIRECT_URL: z.url(),
  USESEND_API_KEY: z.string(),
  USESEND_FROM: z.string(),
})

export const env = envSchema.parse(process.env)

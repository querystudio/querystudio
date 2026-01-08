import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000").transform(Number),
  NODE_ENV: z.enum(["development", "production"]),
  POLAR_ACCESS_TOKEN: z.string().min(1, "POLAR_ACCESS_TOKEN is required"),
  POLAR_ORGANIZATION_ID: z.string().min(1, "POLAR_ORGANIZATION_ID is required"),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

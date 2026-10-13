import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(16).optional(),
  AI_PROVIDER: z.string().default("gemini"),
  AI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_BASE_URL: process.env.APP_BASE_URL || "http://localhost:3000",
  MONGODB_URI: process.env.MONGODB_URI,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AI_PROVIDER: process.env.AI_PROVIDER || "gemini",
  AI_API_KEY: process.env.AI_API_KEY,
});


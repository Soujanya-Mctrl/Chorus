// ── Environment Configuration ────────────────────

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  MONGODB_URI: z.string(),
  MONGODB_DB_NAME: z.string().default('chorus'),

  // Redis — optional in development (queues & cache degrade gracefully)
  REDIS_URL: z.string().optional(),

  // AI Layer
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // GitHub — Personal Access Token (used directly by githubFetcher)
  GITHUB_TOKEN: z.string().optional(),

  // GitHub OAuth (for user login flow)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // GitHub App (optional — for webhook verification & installation auth)
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // Auth
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRY: z.string().default('7d'),

  // Frontend
  CALLBACK_URL: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Observability
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  env: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  mongodb: {
    uri: parsed.data.MONGODB_URI,
    dbName: parsed.data.MONGODB_DB_NAME,
  },
  redis: {
    url: parsed.data.REDIS_URL,
  },
  ai: {
    geminiApiKey: parsed.data.GEMINI_API_KEY,
    openaiApiKey: parsed.data.OPENAI_API_KEY,
  },
  github: {
    token: parsed.data.GITHUB_TOKEN,
    clientId: parsed.data.GITHUB_CLIENT_ID,
    clientSecret: parsed.data.GITHUB_CLIENT_SECRET,
    appId: parsed.data.GITHUB_APP_ID,
    privateKey: parsed.data.GITHUB_APP_PRIVATE_KEY,
    webhookSecret: parsed.data.GITHUB_WEBHOOK_SECRET,
    callbackUrl: parsed.data.CALLBACK_URL,
  },
  auth: {
    jwtSecret: parsed.data.JWT_SECRET ?? 'chorus_dev_secret_change_in_production_32chars!',
    jwtExpiry: parsed.data.JWT_EXPIRY,
  },
  otel: {
    endpoint: parsed.data.OTEL_EXPORTER_OTLP_ENDPOINT,
  },
  logLevel: parsed.data.LOG_LEVEL,
  corsOrigins: parsed.data.CORS_ORIGINS.split(','),
  frontendUrl: parsed.data.FRONTEND_URL,
} as const;

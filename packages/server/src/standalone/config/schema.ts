import { z } from 'zod';

export const LLMConfigSchema = z.object({
  provider: z.enum(['google', 'openai', 'anthropic']),
  model: z.string().optional(),
});

export const LiveConfigSchema = z.object({
  enabled: z.boolean().default(false),
  voice: z.string().optional(),
  model: z.string().optional(),
});

export const STTConfigSchema = z.object({
  provider: z.enum(['google', 'whisper']),
  language: z.string().default('fr-FR'),
  model: z.string().optional(),
});

export const TTSConfigSchema = z.object({
  provider: z.enum(['google', 'openai', 'elevenlabs']),
  voice: z.string().optional(),
  language: z.string().default('fr-FR'),
  voiceType: z.string().optional(),
});

export const AdminConfigSchema = z.object({
  username: z.string().default('admin'),
  password: z.string().optional(), // sera injecté depuis env
  path: z.string().default('/admin'),
});

export const ClientConfigSchema = z.object({
  requireApiKey: z.boolean().default(true),
  enableApiKeyManagement: z.boolean().default(true),
  maxConnectionsPerKey: z.coerce.number().default(10),
});

export const RateLimitConfigSchema = z.object({
  disabled: z.boolean().default(false),
  burstLimit: z.coerce.number().default(15),
  burstWindowMs: z.coerce.number().default(1_000),
  burstCloseAfter: z.coerce.number().default(5),
  maxRequests: z.coerce.number().default(200),
  windowMs: z.coerce.number().default(300_000),
});

export const UIConfigSchema = z.object({
  enabled: z.boolean().default(true),
});

export const ApiKeyConfigSchema = z.object({
  key: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  prompt: z.string().optional(),
  clientType: z.array(z.string()).optional(),
});

export const VirtualLineSchema = z.object({
  apiKey: z.string(),
  count: z.coerce.number(),
  ttlMs: z.coerce.number(),
  waitingTtlMs: z.coerce.number().optional(),
});

export const VirtualLinesConfigSchema = z.object({
  lines: z.array(VirtualLineSchema),
});

const billingPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  stripePriceId: z.string().optional(),
  limits: z.object({
    sessionsPerDay: z.number().int().positive(),
    tokensPerMonth: z.number().int().positive(),
    agentsMax: z.number().int().positive(),
    linesMax: z.number().int().positive(),
  }),
});

export const CloudConfigSchema = z.object({
  jwt: z.object({
    publicKeyPath: z.string(),
    privateKeyPath: z.string(),
    issuer: z.string().default('domos.cloud'),
    audience: z.string().default('domos-api'),
    expiresIn: z.string().default('7d'),
  }),
  database: z.object({
    provider: z.literal('postgresql'),
    url: z.string(),
  }),
  redis: z.object({
    url: z.string(),
  }),
  billing: z.object({
    stripeSecretKey: z.string(),
    webhookSecret: z.string(),
    plans: z.array(billingPlanSchema).min(1),
  }).optional(),
  storeConnect: z.object({
    shopify: z.object({
      clientId: z.string(),
      clientSecret: z.string(),
      scopes: z.array(z.string()),
      webhookSecret: z.string(),
    }).optional(),
    woocommerce: z.object({
      callbackUrl: z.string().url(),
    }).optional(),
  }).optional(),
});

export const DomOSConfigSchema = z.object({
  mode: z.enum(['self', 'cloud']).default('self'),
  port: z.coerce.number().default(3000),
  host: z.string().default('0.0.0.0'),
  path: z.string().default('/domos'),

  llm: LLMConfigSchema,
  live: LiveConfigSchema.optional(),
  stt: STTConfigSchema.optional(),
  tts: TTSConfigSchema.optional(),

  admin: AdminConfigSchema.default({}),
  client: ClientConfigSchema.default({}),
  rateLimit: RateLimitConfigSchema.default({}),
  ui: UIConfigSchema.default({}),

  apiKeys: z.array(ApiKeyConfigSchema).optional(),
  plugins: z.array(
    z.object({
      package: z.string(),
      config: z.record(z.unknown()).optional(),
    }),
  ).optional(),
  virtualLines: VirtualLinesConfigSchema.optional(),

  cloud: CloudConfigSchema.optional(),
}).refine(
  (data) => data.mode !== 'cloud' || data.cloud !== undefined,
  { message: 'cloud config is required when mode is "cloud"' },
);

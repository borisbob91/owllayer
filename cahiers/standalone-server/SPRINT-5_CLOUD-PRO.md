# Sprint 5 — Cloud Pro : Multi-tenant, Auth, Billing, StoreConnect

> **Objectif** : Le serveur supporte le mode Cloud Pro (`DOMOS_MODE=cloud`) avec :
> multi-tenant, JWT auth RS256, RBAC, PostgreSQL via Prisma, Redis sessions,
> quotas/billing, analytics, audit, webhooks, et StoreConnect (Shopify/WooCommerce).
> À la fin de ce sprint: DomOS Cloud est déployable en SaaS.

---

## Prérequis

- Sprint 4 complet — Docker self-hosting fonctionne
- Base PostgreSQL disponible (Docker Compose ou managed)
- Redis disponible
- Comptes Stripe (billing) + Shopify/WooCommerce (test stores)

---

## Phase A — Mode Cloud & Auth

### Étape 5.1 — Feature flag DOMOS_MODE

**Fichier** : `packages/server/src/standalone/config/types.ts` (modifier)

Ajouter le discriminant de mode :

```ts
export interface CloudConfig {
  jwt: {
    publicKeyPath: string;     // RS256 public key
    privateKeyPath: string;    // RS256 private key
    issuer: string;            // ex: "domos.cloud"
    audience: string;          // ex: "domos-api"
    expiresIn: string;         // ex: "7d"
  };
  database: {
    provider: 'postgresql';
    url: string;               // ${DATABASE_URL}
  };
  redis: {
    url: string;               // ${REDIS_URL}
  };
  billing?: {
    stripeSecretKey: string;   // ${STRIPE_SECRET_KEY}
    webhookSecret: string;     // ${STRIPE_WEBHOOK_SECRET}
    plans: BillingPlan[];
  };
  storeConnect?: StoreConnectConfig;
}

export interface BillingPlan {
  id: string;                  // ex: "free", "pro", "enterprise"
  name: string;
  stripePriceId?: string;
  limits: {
    sessionsPerDay: number;
    tokensPerMonth: number;
    agentsMax: number;
    linesMax: number;
  };
}

export interface StoreConnectConfig {
  shopify?: {
    clientId: string;          // ${SHOPIFY_CLIENT_ID}
    clientSecret: string;      // ${SHOPIFY_CLIENT_SECRET}
    scopes: string[];          // ex: ["read_products", "write_orders"]
    webhookSecret: string;
  };
  woocommerce?: {
    callbackUrl: string;       // URL retour OAuth WooCommerce
  };
}

// Config DomOS mise à jour
export interface DomOSConfig {
  mode: 'self' | 'cloud';
  // ... existant (port, host, llm, live, speech, persistence, plugins) ...
  cloud?: CloudConfig;         // Requis si mode === 'cloud'
}
```

**Fichier** : `packages/server/src/standalone/config/schema.ts` (modifier)

Ajouter la validation Zod pour CloudConfig :

```ts
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

const cloudSchema = z.object({
  jwt: z.object({
    publicKeyPath: z.string(),
    privateKeyPath: z.string(),
    issuer: z.string().default('domos.cloud'),
    audience: z.string().default('domos-api'),
    expiresIn: z.string().default('7d'),
  }),
  database: z.object({
    provider: z.literal('postgresql'),
    url: z.string().url(),
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

// Validation globale avec refinement
const domosConfigSchema = z.object({
  mode: z.enum(['self', 'cloud']),
  // ... existant ...
  cloud: cloudSchema.optional(),
}).refine(
  (data) => data.mode !== 'cloud' || data.cloud !== undefined,
  { message: 'cloud config is required when mode is "cloud"' }
);
```

---

### Étape 5.2 — Prisma schema

**Fichier** : `packages/server/src/standalone/cloud/prisma/schema.prisma` (créer)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Organizations ───

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  plan      String   @default("free") // free | pro | enterprise
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members  OrgMember[]
  projects Project[]
  usage    UsageRecord[]
  invoices Invoice[]

  // Stripe
  stripeCustomerId     String?  @unique
  stripeSubscriptionId String?

  // Quotas actuels
  tokensUsedThisMonth  Int      @default(0)
  sessionsToday        Int      @default(0)
}

model OrgMember {
  id     String  @id @default(cuid())
  role   Role    @default(DEVELOPER)
  userId String
  orgId  String

  user User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  org  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId])
}

enum Role {
  OWNER
  ADMIN
  DEVELOPER
  VIEWER
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  passwordHash  String
  createdAt     DateTime @default(now())
  lastLoginAt   DateTime?

  memberships OrgMember[]
  auditLogs   AuditLog[]
}

// ─── Projects ───

model Project {
  id     String @id @default(cuid())
  name   String
  orgId  String
  config Json   // DomOSConfig partiel — override par projet

  org       Organization   @relation(fields: [orgId], references: [id], onDelete: Cascade)
  apiKeys   ProjectApiKey[]
  agents    Agent[]
  lines     VirtualLine[]
  sessions  SessionRecord[]
  stores    ConnectedStore[]
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
}

model ProjectApiKey {
  id        String   @id @default(cuid())
  key       String   @unique  // hashed
  label     String
  projectId String
  scopes    String[] // ["connect", "admin", "read"]
  expiresAt DateTime?
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

// ─── Agents & Lines ───

model Agent {
  id        String  @id @default(cuid())
  name      String
  projectId String
  config    Json    // SystemPrompt, tools, behavior

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

model VirtualLine {
  id        String  @id @default(cuid())
  name      String
  projectId String
  agentId   String?
  config    Json    // Line config : language, voice, etc.

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

// ─── Sessions & Analytics ───

model SessionRecord {
  id         String   @id @default(cuid())
  projectId  String
  lineId     String?
  agentId    String?
  startedAt  DateTime @default(now())
  endedAt    DateTime?
  duration   Int?     // secondes
  tokensIn   Int      @default(0)
  tokensOut  Int      @default(0)
  toolCalls  Int      @default(0)
  status     String   @default("active") // active | completed | error

  project Project @relation(fields: [projectId], references: [id])
}

model UsageRecord {
  id         String   @id @default(cuid())
  orgId      String
  date       DateTime @default(now()) @db.Date
  sessions   Int      @default(0)
  tokensIn   Int      @default(0)
  tokensOut  Int      @default(0)
  toolCalls  Int      @default(0)
  costUsd    Float    @default(0)

  org Organization @relation(fields: [orgId], references: [id])

  @@unique([orgId, date])
}

// ─── Billing ───

model Invoice {
  id        String   @id @default(cuid())
  orgId     String
  amount    Float
  currency  String   @default("usd")
  status    String   // draft | paid | failed
  stripeId  String?  @unique
  period    String   // "2025-01"
  createdAt DateTime @default(now())

  org Organization @relation(fields: [orgId], references: [id])
}

// ─── Audit ───

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  orgId     String?
  action    String   // "project.create", "agent.update", "session.start", ...
  resource  String?  // ID de la ressource
  details   Json?
  ip        String?
  createdAt DateTime @default(now())

  user User? @relation(fields: [userId], references: [id])

  @@index([orgId, createdAt])
  @@index([action])
}

// ─── StoreConnect ───

model ConnectedStore {
  id        String  @id @default(cuid())
  projectId String
  platform  String  // "shopify" | "woocommerce"
  shopDomain String // ex: "my-shop.myshopify.com"
  accessToken String // chiffré au repos

  // Shopify specifics
  shopifyShopId String?

  // WooCommerce specifics
  wooConsumerKey    String?
  wooConsumerSecret String?
  wooApiUrl         String?

  config    Json?   // Config spécifique (webhook topics, sync settings)
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, platform, shopDomain])
}
```

---

### Étape 5.3 — JWT Auth service

**Fichier** : `packages/server/src/standalone/cloud/auth/JWTAuthService.ts` (créer)

```ts
import { readFileSync } from 'fs';
import jwt from 'jsonwebtoken';
import type { CloudConfig } from '../../config/types.js';

export interface JWTPayload {
  sub: string;       // userId
  email: string;
  orgId: string;
  role: string;      // Role enum
  projectId?: string;
}

export class JWTAuthService {
  private publicKey: string;
  private privateKey: string;
  private issuer: string;
  private audience: string;
  private expiresIn: string;

  constructor(config: CloudConfig['jwt']) {
    this.publicKey = readFileSync(config.publicKeyPath, 'utf-8');
    this.privateKey = readFileSync(config.privateKeyPath, 'utf-8');
    this.issuer = config.issuer;
    this.audience = config.audience;
    this.expiresIn = config.expiresIn;
  }

  sign(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      issuer: this.issuer,
      audience: this.audience,
      expiresIn: this.expiresIn,
    });
  }

  verify(token: string): JWTPayload {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
      issuer: this.issuer,
      audience: this.audience,
    }) as JWTPayload;
  }

  decode(token: string): JWTPayload | null {
    const decoded = jwt.decode(token);
    return decoded as JWTPayload | null;
  }
}
```

---

### Étape 5.4 — RBAC Middleware

**Fichier** : `packages/server/src/standalone/cloud/auth/rbac.ts` (créer)

```ts
import type { Role } from '@prisma/client';

/**
 * Hiérarchie des rôles (du plus élevé au plus bas).
 * Un rôle supérieur hérite des permissions inférieures.
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 40,
  ADMIN: 30,
  DEVELOPER: 20,
  VIEWER: 10,
};

export type Permission =
  | 'project.read'
  | 'project.write'
  | 'project.delete'
  | 'agent.read'
  | 'agent.write'
  | 'agent.delete'
  | 'line.read'
  | 'line.write'
  | 'line.delete'
  | 'session.connect'
  | 'session.read'
  | 'analytics.read'
  | 'billing.read'
  | 'billing.write'
  | 'member.read'
  | 'member.invite'
  | 'member.remove'
  | 'apikey.read'
  | 'apikey.write'
  | 'store.read'
  | 'store.connect'
  | 'store.disconnect'
  | 'audit.read';

/**
 * Permissions par rôle minimal requis.
 * Ex: DEVELOPER peut connect, ADMIN peut invite, OWNER peut delete project.
 */
const PERMISSION_MIN_ROLE: Record<Permission, Role> = {
  // Lecture — tout le monde
  'project.read': 'VIEWER',
  'agent.read': 'VIEWER',
  'line.read': 'VIEWER',
  'session.read': 'VIEWER',
  'analytics.read': 'VIEWER',
  'store.read': 'VIEWER',

  // Écriture — Developer
  'session.connect': 'DEVELOPER',
  'agent.write': 'DEVELOPER',
  'line.write': 'DEVELOPER',
  'apikey.read': 'DEVELOPER',

  // Admin
  'project.write': 'ADMIN',
  'member.read': 'ADMIN',
  'member.invite': 'ADMIN',
  'member.remove': 'ADMIN',
  'billing.read': 'ADMIN',
  'apikey.write': 'ADMIN',
  'store.connect': 'ADMIN',
  'store.disconnect': 'ADMIN',
  'audit.read': 'ADMIN',

  // Owner only
  'project.delete': 'OWNER',
  'agent.delete': 'OWNER',
  'line.delete': 'OWNER',
  'billing.write': 'OWNER',
};

export function hasPermission(userRole: Role, permission: Permission): boolean {
  const minRole = PERMISSION_MIN_ROLE[permission];
  if (!minRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export function requirePermission(userRole: Role, permission: Permission): void {
  if (!hasPermission(userRole, permission)) {
    const err = new Error(`Forbidden: requires permission "${permission}"`);
    (err as any).statusCode = 403;
    throw err;
  }
}
```

---

## Phase B — Quota & Billing

### Étape 5.5 — QuotaService

**Fichier** : `packages/server/src/standalone/cloud/billing/QuotaService.ts` (créer)

```ts
import type { PrismaClient } from '@prisma/client';
import type { BillingPlan } from '../../config/types.js';

export class QuotaService {
  constructor(
    private prisma: PrismaClient,
    private plans: BillingPlan[],
  ) {}

  async checkSessionQuota(orgId: string): Promise<{ allowed: boolean; reason?: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, sessionsToday: true },
    });
    if (!org) return { allowed: false, reason: 'Organization not found' };

    const plan = this.plans.find(p => p.id === org.plan);
    if (!plan) return { allowed: false, reason: 'Unknown plan' };

    if (org.sessionsToday >= plan.limits.sessionsPerDay) {
      return { allowed: false, reason: `Daily session limit reached (${plan.limits.sessionsPerDay})` };
    }

    return { allowed: true };
  }

  async checkTokenQuota(orgId: string, tokensToAdd: number): Promise<{ allowed: boolean; reason?: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, tokensUsedThisMonth: true },
    });
    if (!org) return { allowed: false, reason: 'Organization not found' };

    const plan = this.plans.find(p => p.id === org.plan);
    if (!plan) return { allowed: false, reason: 'Unknown plan' };

    if (org.tokensUsedThisMonth + tokensToAdd > plan.limits.tokensPerMonth) {
      return { allowed: false, reason: `Monthly token limit reached (${plan.limits.tokensPerMonth})` };
    }

    return { allowed: true };
  }

  async incrementSessionCount(orgId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { sessionsToday: { increment: 1 } },
    });
  }

  async incrementTokenUsage(orgId: string, tokens: number): Promise<void> {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { tokensUsedThisMonth: { increment: tokens } },
    });
  }

  /** Reset quotas journaliers — à appeler via cron à minuit UTC */
  async resetDailyQuotas(): Promise<void> {
    await this.prisma.organization.updateMany({
      data: { sessionsToday: 0 },
    });
  }

  /** Reset quotas mensuels — à appeler le 1er du mois */
  async resetMonthlyQuotas(): Promise<void> {
    await this.prisma.organization.updateMany({
      data: { tokensUsedThisMonth: 0 },
    });
  }
}
```

---

### Étape 5.6 — StripeService (billing)

**Fichier** : `packages/server/src/standalone/cloud/billing/StripeService.ts` (créer)

```ts
import Stripe from 'stripe';
import type { PrismaClient } from '@prisma/client';
import type { BillingPlan, CloudConfig } from '../../config/types.js';

export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;
  private plans: BillingPlan[];

  constructor(
    config: NonNullable<CloudConfig['billing']>,
    private prisma: PrismaClient,
    plans: BillingPlan[],
  ) {
    this.stripe = new Stripe(config.stripeSecretKey, { apiVersion: '2024-06-20' });
    this.webhookSecret = config.webhookSecret;
    this.plans = plans;
  }

  async createCustomer(orgId: string, email: string, name: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { orgId },
    });
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  async createSubscription(orgId: string, planId: string): Promise<string> {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    const plan = this.plans.find(p => p.id === planId);
    if (!plan?.stripePriceId) throw new Error(`Plan ${planId} has no Stripe price`);
    if (!org.stripeCustomerId) throw new Error('Organization has no Stripe customer');

    const subscription = await this.stripe.subscriptions.create({
      customer: org.stripeCustomerId,
      items: [{ price: plan.stripePriceId }],
      metadata: { orgId, planId },
    });

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { plan: planId, stripeSubscriptionId: subscription.id },
    });

    return subscription.id;
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const orgId = invoice.subscription_details?.metadata?.orgId;
        if (orgId) {
          await this.prisma.invoice.create({
            data: {
              orgId,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency,
              status: 'paid',
              stripeId: invoice.id,
              period: new Date(invoice.period_start * 1000).toISOString().slice(0, 7),
            },
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.orgId;
        if (orgId) {
          await this.prisma.organization.update({
            where: { id: orgId },
            data: { plan: 'free', stripeSubscriptionId: null },
          });
        }
        break;
      }
    }
  }
}
```

---

## Phase C — Analytics & Audit

### Étape 5.7 — AnalyticsService

**Fichier** : `packages/server/src/standalone/cloud/analytics/AnalyticsService.ts` (créer)

```ts
import type { PrismaClient } from '@prisma/client';

export interface AnalyticsSummary {
  period: string;           // "2025-01" ou "2025-01-15"
  totalSessions: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalToolCalls: number;
  estimatedCostUsd: number;
  averageDuration: number;  // secondes
}

export class AnalyticsService {
  constructor(private prisma: PrismaClient) {}

  async getOrgSummary(orgId: string, startDate: Date, endDate: Date): Promise<AnalyticsSummary[]> {
    const records = await this.prisma.usageRecord.findMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    return records.map(r => ({
      period: r.date.toISOString().slice(0, 10),
      totalSessions: r.sessions,
      totalTokensIn: r.tokensIn,
      totalTokensOut: r.tokensOut,
      totalToolCalls: r.toolCalls,
      estimatedCostUsd: r.costUsd,
      averageDuration: 0, // à enrichir
    }));
  }

  async recordSessionEnd(
    projectId: string,
    orgId: string,
    data: { tokensIn: number; tokensOut: number; toolCalls: number; duration: number }
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upsert le record de la journée
    await this.prisma.usageRecord.upsert({
      where: { orgId_date: { orgId, date: today } },
      create: {
        orgId,
        date: today,
        sessions: 1,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
        toolCalls: data.toolCalls,
        costUsd: this.estimateCost(data.tokensIn, data.tokensOut),
      },
      update: {
        sessions: { increment: 1 },
        tokensIn: { increment: data.tokensIn },
        tokensOut: { increment: data.tokensOut },
        toolCalls: { increment: data.toolCalls },
        costUsd: { increment: this.estimateCost(data.tokensIn, data.tokensOut) },
      },
    });
  }

  private estimateCost(tokensIn: number, tokensOut: number): number {
    // Prix approximatif — configurable par plan
    const inputRate = 0.075 / 1_000_000;  // $0.075/M tokens (Gemini Flash)
    const outputRate = 0.30 / 1_000_000;  // $0.30/M tokens
    return tokensIn * inputRate + tokensOut * outputRate;
  }
}
```

---

### Étape 5.8 — AuditService

**Fichier** : `packages/server/src/standalone/cloud/audit/AuditService.ts` (créer)

```ts
import type { PrismaClient } from '@prisma/client';

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'org.create'
  | 'org.update'
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'agent.create'
  | 'agent.update'
  | 'agent.delete'
  | 'line.create'
  | 'line.update'
  | 'line.delete'
  | 'session.start'
  | 'session.end'
  | 'apikey.create'
  | 'apikey.revoke'
  | 'store.connect'
  | 'store.disconnect'
  | 'billing.plan_change'
  | 'member.invite'
  | 'member.remove'
  | 'member.role_change';

export class AuditService {
  constructor(private prisma: PrismaClient) {}

  async log(params: {
    userId?: string;
    orgId?: string;
    action: AuditAction;
    resource?: string;
    details?: Record<string, unknown>;
    ip?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({ data: params });
  }

  async query(params: {
    orgId: string;
    action?: AuditAction;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        orgId: params.orgId,
        ...(params.action && { action: params.action }),
        ...(params.userId && { userId: params.userId }),
        ...(params.startDate && { createdAt: { gte: params.startDate } }),
        ...(params.endDate && { createdAt: { lte: params.endDate } }),
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
      include: { user: { select: { email: true, name: true } } },
    });
  }
}
```

---

## Phase D — StoreConnect

### Étape 5.9 — Shopify OAuth + API

**Fichier** : `packages/server/src/standalone/cloud/stores/ShopifyConnector.ts` (créer)

```ts
import crypto from 'crypto';

export interface ShopifyConfig {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  webhookSecret: string;
}

export class ShopifyConnector {
  constructor(private config: ShopifyConfig) {}

  /**
   * Génère l'URL d'autorisation OAuth Shopify.
   * Redirect le marchand vers Shopify → il autorise → callback avec code.
   */
  getAuthUrl(shop: string, redirectUri: string, state: string): string {
    const scopes = this.config.scopes.join(',');
    return `https://${shop}/admin/oauth/authorize?` +
      `client_id=${this.config.clientId}&scope=${scopes}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  /**
   * Échange le code OAuth contre un access token.
   */
  async exchangeCode(shop: string, code: string): Promise<string> {
    const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
      }),
    });

    if (!res.ok) throw new Error(`Shopify token exchange failed: ${res.status}`);
    const data = await res.json() as { access_token: string };
    return data.access_token;
  }

  /**
   * Vérifie la signature HMAC d'un webhook Shopify.
   */
  verifyWebhook(body: Buffer, hmacHeader: string): boolean {
    const computed = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(body)
      .digest('base64');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmacHeader));
  }

  /**
   * Appelle l'API REST Shopify Admin.
   */
  async apiCall<T = unknown>(
    shop: string,
    accessToken: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`https://${shop}/admin/api/2024-10/${endpoint}`, {
      method,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!res.ok) throw new Error(`Shopify API ${endpoint}: ${res.status}`);
    return res.json() as T;
  }
}
```

---

### Étape 5.10 — WooCommerce OAuth + API

**Fichier** : `packages/server/src/standalone/cloud/stores/WooCommerceConnector.ts` (créer)

```ts
import crypto from 'crypto';

export interface WooCommerceConfig {
  callbackUrl: string;
}

export class WooCommerceConnector {
  constructor(private config: WooCommerceConfig) {}

  /**
   * Génère l'URL d'autorisation WooCommerce (wc-auth flow).
   * WooCommerce envoie consumer_key + consumer_secret au callback_url.
   */
  getAuthUrl(storeUrl: string, appName: string = 'DomOS'): string {
    return `${storeUrl}/wc-auth/v1/authorize?` +
      `app_name=${encodeURIComponent(appName)}` +
      `&scope=read_write` +
      `&user_id=1` +
      `&return_url=${encodeURIComponent(this.config.callbackUrl)}` +
      `&callback_url=${encodeURIComponent(this.config.callbackUrl)}`;
  }

  /**
   * Appelle l'API REST WooCommerce.
   */
  async apiCall<T = unknown>(
    storeUrl: string,
    consumerKey: string,
    consumerSecret: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown,
  ): Promise<T> {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const res = await fetch(`${storeUrl}/wp-json/wc/v3/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!res.ok) throw new Error(`WooCommerce API ${endpoint}: ${res.status}`);
    return res.json() as T;
  }

  /**
   * Vérifie que le callback est bien un JSON WooCommerce valide.
   */
  parseCallback(body: { consumer_key: string; consumer_secret: string; key_permissions: string }): {
    consumerKey: string;
    consumerSecret: string;
    permissions: string;
  } {
    if (!body.consumer_key || !body.consumer_secret) {
      throw new Error('Invalid WooCommerce callback payload');
    }
    return {
      consumerKey: body.consumer_key,
      consumerSecret: body.consumer_secret,
      permissions: body.key_permissions,
    };
  }
}
```

---

### Étape 5.11 — DomOS Tools pour e-commerce

**Fichier** : `packages/server/src/standalone/cloud/stores/storeTools.ts` (créer)

Ce sont les tools que l'agent vocal peut appeler pour interagir avec le store connecté.

```ts
import type { ToolDeclaration } from '@domos/core';
import type { ShopifyConnector } from './ShopifyConnector.js';
import type { WooCommerceConnector } from './WooCommerceConnector.js';
import type { PrismaClient } from '@prisma/client';

/**
 * Génère les ToolDeclarations e-commerce dynamiquement selon le store connecté.
 */
export function getStoreTools(
  store: { platform: string; shopDomain: string; accessToken: string; wooConsumerKey?: string; wooConsumerSecret?: string; wooApiUrl?: string },
  shopify?: ShopifyConnector,
  woo?: WooCommerceConnector,
): ToolDeclaration[] {
  const tools: ToolDeclaration[] = [];

  // ── Commun à tous les stores ──

  tools.push({
    name: 'search_products',
    description: 'Rechercher des produits dans le catalogue du store',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Terme de recherche' },
        limit: { type: 'number', description: 'Nombre max de résultats (défaut: 10)' },
      },
      required: ['query'],
    },
  });

  tools.push({
    name: 'get_product',
    description: 'Obtenir les détails d\'un produit par son ID',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'ID du produit' },
      },
      required: ['productId'],
    },
  });

  tools.push({
    name: 'get_order_status',
    description: 'Vérifier le statut d\'une commande',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'Numéro de commande' },
      },
      required: ['orderId'],
    },
  });

  tools.push({
    name: 'search_orders',
    description: 'Rechercher les commandes d\'un client par email',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email du client' },
        status: { type: 'string', description: 'Filtre par statut (pending, processing, shipped)' },
      },
      required: ['email'],
    },
  });

  tools.push({
    name: 'check_inventory',
    description: 'Vérifier le stock d\'un produit',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'ID du produit' },
        variantId: { type: 'string', description: 'ID du variant (optionnel)' },
      },
      required: ['productId'],
    },
  });

  return tools;
}
```

---

## Phase E — Cloud REST API Routes

### Étape 5.12 — Routes API Cloud

**Fichier** : `packages/server/src/standalone/cloud/routes/index.ts` (créer)

Structure des routes ajoutées quand `mode === 'cloud'` :

```ts
/**
 * Routes Cloud — ajoutées au serveur HTTP quand DOMOS_MODE=cloud
 *
 * Auth:
 *   POST   /api/auth/login         → { email, password } → { token }
 *   POST   /api/auth/register      → { email, password, name } → { token }
 *   POST   /api/auth/refresh       → { token } → { token }
 *
 * Organizations:
 *   GET    /api/orgs               → Liste des orgs du user
 *   POST   /api/orgs               → Créer une org
 *   GET    /api/orgs/:orgId        → Détails org
 *   PATCH  /api/orgs/:orgId        → Modifier org
 *   GET    /api/orgs/:orgId/members      → Liste membres
 *   POST   /api/orgs/:orgId/members      → Inviter membre
 *   DELETE /api/orgs/:orgId/members/:id  → Retirer membre
 *
 * Projects:
 *   GET    /api/orgs/:orgId/projects            → Liste projets
 *   POST   /api/orgs/:orgId/projects            → Créer projet
 *   GET    /api/orgs/:orgId/projects/:projectId → Détails projet
 *   PATCH  /api/orgs/:orgId/projects/:projectId → Modifier projet
 *   DELETE /api/orgs/:orgId/projects/:projectId → Supprimer projet
 *
 * Agents:
 *   GET    /api/projects/:projectId/agents      → Liste agents
 *   POST   /api/projects/:projectId/agents      → Créer agent
 *   PATCH  /api/projects/:projectId/agents/:id  → Modifier agent
 *   DELETE /api/projects/:projectId/agents/:id  → Supprimer agent
 *
 * Lines:
 *   GET    /api/projects/:projectId/lines       → Liste lignes virtuelles
 *   POST   /api/projects/:projectId/lines       → Créer ligne
 *   PATCH  /api/projects/:projectId/lines/:id   → Modifier ligne
 *   DELETE /api/projects/:projectId/lines/:id   → Supprimer ligne
 *
 * Analytics:
 *   GET    /api/orgs/:orgId/analytics           → Résumé usage
 *   GET    /api/orgs/:orgId/analytics/sessions  → Sessions détaillées
 *
 * Billing:
 *   GET    /api/orgs/:orgId/billing             → Plan actuel + quotas
 *   POST   /api/orgs/:orgId/billing/subscribe   → Souscrire à un plan
 *   GET    /api/orgs/:orgId/billing/invoices    → Historique factures
 *   POST   /api/billing/webhook                 → Stripe webhook (pas auth JWT)
 *
 * StoreConnect:
 *   GET    /api/projects/:projectId/stores                → Stores connectés
 *   POST   /api/projects/:projectId/stores/shopify/auth   → Démarrer OAuth Shopify
 *   GET    /api/stores/shopify/callback                   → Callback OAuth Shopify
 *   POST   /api/projects/:projectId/stores/woo/auth       → Démarrer auth WooCommerce
 *   POST   /api/stores/woo/callback                       → Callback WooCommerce
 *   DELETE /api/projects/:projectId/stores/:storeId       → Déconnecter store
 *
 * Audit:
 *   GET    /api/orgs/:orgId/audit               → Logs d'audit paginés
 *
 * Health:
 *   GET    /health                              → Health check (pas auth)
 *   GET    /admin/capabilities                  → Capabilities (admin auth)
 */
```

Chaque route sera implémentée dans un fichier séparé par domaine :
- `cloud/routes/auth.ts`
- `cloud/routes/orgs.ts`
- `cloud/routes/projects.ts`
- `cloud/routes/agents.ts`
- `cloud/routes/lines.ts`
- `cloud/routes/analytics.ts`
- `cloud/routes/billing.ts`
- `cloud/routes/stores.ts`
- `cloud/routes/audit.ts`

---

### Étape 5.13 — Intégrer le mode Cloud dans createDomOSServer

**Fichier** : `packages/server/src/standalone/createDomOSServer.ts` (modifier)

```ts
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { JWTAuthService } from './cloud/auth/JWTAuthService.js';
import { QuotaService } from './cloud/billing/QuotaService.js';
import { StripeService } from './cloud/billing/StripeService.js';
import { AnalyticsService } from './cloud/analytics/AnalyticsService.js';
import { AuditService } from './cloud/audit/AuditService.js';
import { ShopifyConnector } from './cloud/stores/ShopifyConnector.js';
import { WooCommerceConnector } from './cloud/stores/WooCommerceConnector.js';

// Dans createDomOSServer() :

if (config.mode === 'cloud' && config.cloud) {
  const prisma = new PrismaClient({ datasourceUrl: config.cloud.database.url });
  await prisma.$connect();

  const redis = createClient({ url: config.cloud.redis.url });
  await redis.connect();

  const jwtAuth = new JWTAuthService(config.cloud.jwt);
  const quotas = new QuotaService(prisma, config.cloud.billing?.plans ?? []);
  const analytics = new AnalyticsService(prisma);
  const audit = new AuditService(prisma);

  // Billing (optionnel)
  const stripe = config.cloud.billing
    ? new StripeService(config.cloud.billing, prisma, config.cloud.billing.plans)
    : null;

  // StoreConnect (optionnel)
  const shopify = config.cloud.storeConnect?.shopify
    ? new ShopifyConnector(config.cloud.storeConnect.shopify)
    : null;
  const woo = config.cloud.storeConnect?.woocommerce
    ? new WooCommerceConnector(config.cloud.storeConnect.woocommerce)
    : null;

  // Enregistrer les routes Cloud
  // registerCloudRoutes(httpServer, { prisma, redis, jwtAuth, quotas, analytics, audit, stripe, shopify, woo });

  // Hook : vérification quotas avant session
  server.onBeforeSession(async (session) => {
    const orgId = session.getOrgId();
    if (orgId) {
      const check = await quotas.checkSessionQuota(orgId);
      if (!check.allowed) {
        throw new Error(`Quota exceeded: ${check.reason}`);
      }
      await quotas.incrementSessionCount(orgId);
    }
  });

  // Hook : analytics en fin de session
  server.onSessionEnd(async (session) => {
    const orgId = session.getOrgId();
    const projectId = session.getProjectId();
    if (orgId && projectId) {
      await analytics.recordSessionEnd(projectId, orgId, {
        tokensIn: session.getTokensIn(),
        tokensOut: session.getTokensOut(),
        toolCalls: session.getToolCallCount(),
        duration: session.getDuration(),
      });
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
}
```

---

### Étape 5.14 — Config YAML Cloud exemple

**Fichier** : `packages/server/docker/config/domos.cloud.yml` (créer — template)

```yaml
mode: cloud

server:
  port: 3000
  host: "0.0.0.0"
  adminPassword: ${ADMIN_PASSWORD}

llm:
  provider: google
  model: gemini-2.0-flash-001

live:
  provider: google
  model: gemini-2.0-flash-live-001
  voice: Kore

speech:
  stt:
    provider: google
    language: fr-FR
  tts:
    provider: google
    language: fr-FR

persistence:
  type: sqlite
  path: /data/domos.db

cloud:
  jwt:
    publicKeyPath: /keys/public.pem
    privateKeyPath: /keys/private.pem
    issuer: domos.cloud
    audience: domos-api
    expiresIn: 7d

  database:
    provider: postgresql
    url: ${DATABASE_URL}

  redis:
    url: ${REDIS_URL}

  billing:
    stripeSecretKey: ${STRIPE_SECRET_KEY}
    webhookSecret: ${STRIPE_WEBHOOK_SECRET}
    plans:
      - id: free
        name: Free
        limits:
          sessionsPerDay: 50
          tokensPerMonth: 1000000
          agentsMax: 2
          linesMax: 1
      - id: pro
        name: Pro
        stripePriceId: ${STRIPE_PRICE_PRO}
        limits:
          sessionsPerDay: 500
          tokensPerMonth: 10000000
          agentsMax: 10
          linesMax: 5
      - id: enterprise
        name: Enterprise
        stripePriceId: ${STRIPE_PRICE_ENTERPRISE}
        limits:
          sessionsPerDay: 10000
          tokensPerMonth: 100000000
          agentsMax: 100
          linesMax: 50

  storeConnect:
    shopify:
      clientId: ${SHOPIFY_CLIENT_ID}
      clientSecret: ${SHOPIFY_CLIENT_SECRET}
      scopes:
        - read_products
        - read_orders
        - read_inventory
        - write_orders
      webhookSecret: ${SHOPIFY_WEBHOOK_SECRET}
    woocommerce:
      callbackUrl: ${WOO_CALLBACK_URL}

plugins:
  - package: "@domos-plugins/demo-promotions"
```

---

### Étape 5.15 — docker-compose Cloud

**Fichier** : `packages/server/docker/docker-compose.cloud.yml` (créer)

```yaml
version: "3.8"

services:
  domos:
    build:
      context: ../../..
      dockerfile: packages/server/Dockerfile
    container_name: domos-cloud
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    env_file:
      - .env.cloud
    volumes:
      - ./config:/config:ro
      - ./keys:/keys:ro
      - domos-data:/data
    environment:
      - NODE_ENV=production
      - DOMOS_CONFIG_PATH=/config/domos.cloud.yml
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: domos
      POSTGRES_USER: domos
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U domos" ]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    healthcheck:
      test: [ "CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping" ]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  domos-data:
  pg-data:
  redis-data:
```

---

## Résumé Sprint 5

| # | Fichier | Action | Livrable |
|---|---------|--------|----------|
| 5.1 | `config/types.ts` + `config/schema.ts` | Modifier | CloudConfig + validation |
| 5.2 | `cloud/prisma/schema.prisma` | **Créer** | Modèles DB complets |
| 5.3 | `cloud/auth/JWTAuthService.ts` | **Créer** | JWT RS256 sign/verify |
| 5.4 | `cloud/auth/rbac.ts` | **Créer** | Permissions RBAC |
| 5.5 | `cloud/billing/QuotaService.ts` | **Créer** | Quotas sessions/tokens |
| 5.6 | `cloud/billing/StripeService.ts` | **Créer** | Stripe subscriptions |
| 5.7 | `cloud/analytics/AnalyticsService.ts` | **Créer** | Usage tracking |
| 5.8 | `cloud/audit/AuditService.ts` | **Créer** | Audit logs |
| 5.9 | `cloud/stores/ShopifyConnector.ts` | **Créer** | OAuth + API Shopify |
| 5.10 | `cloud/stores/WooCommerceConnector.ts` | **Créer** | OAuth + API WooCommerce |
| 5.11 | `cloud/stores/storeTools.ts` | **Créer** | Tools e-commerce pour agents |
| 5.12 | `cloud/routes/index.ts` + 9 fichiers | **Créer** | REST API complète |
| 5.13 | `createDomOSServer.ts` | Modifier | Intégrer mode cloud |
| 5.14 | `docker/config/domos.cloud.yml` | **Créer** | Config YAML Cloud |
| 5.15 | `docker/docker-compose.cloud.yml` | **Créer** | Docker Compose avec PG + Redis |

**Nouvelles dépendances** :
```json
{
  "dependencies": {
    "@prisma/client": "^6.x",
    "jsonwebtoken": "^9.x",
    "stripe": "^17.x",
    "redis": "^4.x"
  },
  "devDependencies": {
    "prisma": "^6.x",
    "@types/jsonwebtoken": "^9.x"
  }
}
```

**Critère de fin de sprint** :
```bash
# Cloud mode démarré
DOMOS_MODE=cloud docker compose -f docker-compose.cloud.yml up -d
# → PostgreSQL ✅, Redis ✅, DomOS Cloud ✅

# Auth fonctionne
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"securepass","name":"Test"}'
# → {"token":"eyJhbGciOiJSUzI1NiI..."} ✅

# RBAC fonctionne
# → VIEWER ne peut pas modifier, DEVELOPER peut connect, ADMIN peut inviter ✅

# Quotas respectés
# → 51ème session/jour en plan Free → 429 "Quota exceeded" ✅

# StoreConnect Shopify
# → OAuth flow complet → store connecté → agent peut search_products ✅

# Analytics
curl http://localhost:3000/api/orgs/ORG_ID/analytics \
  -H "Authorization: Bearer TOKEN"
# → [{"period":"2025-01-15","totalSessions":42,...}] ✅

# Audit
curl http://localhost:3000/api/orgs/ORG_ID/audit \
  -H "Authorization: Bearer TOKEN"
# → [{"action":"user.login","userId":"...","createdAt":"..."},...] ✅
```

---

## Vue d'ensemble des 5 sprints

| Sprint | Thème | Fichiers créés | Dépendances ajoutées |
|--------|-------|----------------|----------------------|
| **1** | Fondations standalone | 7 | yaml, zod, dotenv |
| **2** | Capabilities + Adapters | 8 | @anthropic-ai/sdk |
| **3** | Dashboard + Framework adapters + Plugins | 11 | — (peerDeps uniquement) |
| **4** | Docker + Self-hosting | 10 | — |
| **5** | Cloud Pro complet | 18+ | @prisma/client, jsonwebtoken, stripe, redis |

**Total estimé** : ~55 fichiers, ~4500 lignes de code, 0 réécritures du code existant.

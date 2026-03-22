# Backend SaaS DomOS - Architecture NestJS

> Backend complet pour gérer licences, billing, multi-tenant, usage metering, analytics

---

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Apps                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Dashboard   │  │  Widget SDK  │  │  Admin Panel │          │
│  │  (Client)    │  │  (@domos/*)  │  │  (Internal)  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (NestJS)                          │
│                      Port: 4000                                  │
├─────────────────────────────────────────────────────────────────┤
│  Authentication │ Rate Limiting │ CORS │ Logging │ Monitoring   │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Core Modules (NestJS)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Auth       │  │   Tenants    │  │   Billing    │         │
│  │   Module     │  │   Module     │  │   Module     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Usage      │  │  Analytics   │  │   Webhooks   │         │
│  │   Module     │  │   Module     │  │   Module     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Domains    │  │   API Keys   │  │   Admin      │         │
│  │   Module     │  │   Module     │  │   Module     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External Services                              │
├─────────────────────────────────────────────────────────────────┤
│  Stripe      │  SendGrid   │  Redis      │  S3         │  Sentry│
│  (Billing)   │  (Email)    │  (Cache)    │  (Storage)  │  (Logs)│
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Database Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL (Primary) │ Redis (Cache) │ MongoDB (Analytics)     │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DomOS Core Server                              │
│              (Vocal + Self-Driving Engine)                       │
│                      Port: 3000                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure du Projet

```
domos-backend/
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .env.example
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── main.ts                      # Bootstrap NestJS
│   ├── app.module.ts                # Root module
│   ├── config/
│   │   ├── configuration.ts         # Config centralisée
│   │   └── validation.schema.ts     # Validation env vars
│   │
│   ├── common/
│   │   ├── decorators/              # Custom decorators
│   │   ├── guards/                  # Auth guards
│   │   ├── filters/                 # Exception filters
│   │   ├── interceptors/            # Response interceptors
│   │   └── pipes/                   # Validation pipes
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/          # JWT, API Key strategies
│   │   │   └── dto/
│   │   │
│   │   ├── tenants/
│   │   │   ├── tenants.module.ts
│   │   │   ├── tenants.controller.ts
│   │   │   ├── tenants.service.ts
│   │   │   ├── entities/
│   │   │   └── dto/
│   │   │
│   │   ├── billing/
│   │   │   ├── billing.module.ts
│   │   │   ├── billing.controller.ts
│   │   │   ├── billing.service.ts
│   │   │   ├── stripe/              # Stripe integration
│   │   │   └── dto/
│   │   │
│   │   ├── usage/
│   │   │   ├── usage.module.ts
│   │   │   ├── usage.controller.ts
│   │   │   ├── usage.service.ts
│   │   │   ├── metering.service.ts  # Usage tracking
│   │   │   └── dto/
│   │   │
│   │   ├── analytics/
│   │   │   ├── analytics.module.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── webhooks/
│   │   │   ├── webhooks.module.ts
│   │   │   ├── webhooks.controller.ts
│   │   │   └── webhooks.service.ts
│   │   │
│   │   ├── domains/
│   │   │   ├── domains.module.ts
│   │   │   ├── domains.controller.ts
│   │   │   └── domains.service.ts
│   │   │
│   │   ├── api-keys/
│   │   │   ├── api-keys.module.ts
│   │   │   ├── api-keys.controller.ts
│   │   │   └── api-keys.service.ts
│   │   │
│   │   └── admin/
│   │       ├── admin.module.ts
│   │       ├── admin.controller.ts
│   │       └── admin.service.ts
│   │
│   └── database/
│       ├── prisma.service.ts
│       └── seeds/
│
├── test/
│   ├── unit/
│   └── e2e/
│
└── scripts/
    ├── migrate.sh
    └── seed.sh
```

---

## 🗄️ Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// Tenants (Organizations)
// ============================================================

model Tenant {
  id                String   @id @default(cuid())
  name              String
  slug              String   @unique
  email             String   @unique
  
  // Subscription
  plan              Plan     @default(STARTER)
  status            TenantStatus @default(TRIAL)
  billingCycle      BillingCycle @default(MONTHLY)
  
  // Limits
  includedConversations Int  @default(500)
  maxDomains        Int      @default(1)
  
  // Stripe
  stripeCustomerId  String?  @unique
  stripeSubscriptionId String?
  
  // Metadata
  metadata          Json?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  users             User[]
  domains           Domain[]
  apiKeys           ApiKey[]
  usage             Usage[]
  conversations     Conversation[]
  invoices          Invoice[]
  
  @@index([slug])
  @@index([stripeCustomerId])
}

enum Plan {
  FREEMIUM
  STARTER
  BUSINESS
  ENTERPRISE
  AGENCY
}

enum TenantStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELED
  SUSPENDED
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

// ============================================================
// Users
// ============================================================

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  firstName     String?
  lastName      String?
  role          UserRole @default(MEMBER)
  
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([tenantId])
  @@index([email])
}

enum UserRole {
  OWNER
  ADMIN
  MEMBER
}

// ============================================================
// Domains
// ============================================================

model Domain {
  id            String   @id @default(cuid())
  domain        String   @unique
  verified      Boolean  @default(false)
  
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([tenantId])
  @@index([domain])
}

// ============================================================
// API Keys
// ============================================================

model ApiKey {
  id            String   @id @default(cuid())
  key           String   @unique
  name          String
  lastUsedAt    DateTime?
  
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime @default(now())
  
  @@index([tenantId])
  @@index([key])
}

// ============================================================
// Usage Tracking
// ============================================================

model Usage {
  id            String   @id @default(cuid())
  date          DateTime @db.Date
  
  // Counters
  conversations Int      @default(0)
  audioMinutes  Float    @default(0)
  apiCalls      Int      @default(0)
  
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([tenantId, date])
  @@index([tenantId, date])
}

// ============================================================
// Conversations
// ============================================================

model Conversation {
  id            String   @id @default(cuid())
  sessionId     String   @unique
  
  // Metadata
  mode          ConversationMode
  duration      Int?     // seconds
  messageCount  Int      @default(0)
  audioMinutes  Float?
  
  // Cost tracking
  sttCost       Float?
  llmCost       Float?
  ttsCost       Float?
  totalCost     Float?
  
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  startedAt     DateTime @default(now())
  endedAt       DateTime?
  
  @@index([tenantId])
  @@index([startedAt])
}

enum ConversationMode {
  TEXT
  HYBRID
  LIVE
}

// ============================================================
// Invoices
// ============================================================

model Invoice {
  id                String   @id @default(cuid())
  stripeInvoiceId   String   @unique
  
  // Amounts (in cents)
  subscriptionAmount Int
  usageAmount       Int
  totalAmount       Int
  
  // Period
  periodStart       DateTime
  periodEnd         DateTime
  
  // Status
  status            InvoiceStatus
  paidAt            DateTime?
  
  tenantId          String
  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  createdAt         DateTime @default(now())
  
  @@index([tenantId])
  @@index([status])
}

enum InvoiceStatus {
  DRAFT
  OPEN
  PAID
  VOID
  UNCOLLECTIBLE
}

// ============================================================
// Webhook Events
// ============================================================

model WebhookEvent {
  id            String   @id @default(cuid())
  type          String
  payload       Json
  processed     Boolean  @default(false)
  error         String?
  
  createdAt     DateTime @default(now())
  processedAt   DateTime?
  
  @@index([processed])
  @@index([type])
}
```

---

## 🚀 Modules Principaux

### 1. Auth Module

```typescript
// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ApiKeyStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

```typescript
// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, tenantName: string) {
    // Créer le tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        name: tenantName,
        slug: this.generateSlug(tenantName),
        email,
        plan: 'FREEMIUM',
        status: 'TRIAL',
      },
    });

    // Créer l'utilisateur owner
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'OWNER',
        tenantId: tenant.id,
      },
    });

    // Créer une API key par défaut
    const apiKey = await this.prisma.apiKey.create({
      data: {
        key: this.generateApiKey(),
        name: 'Default',
        tenantId: tenant.id,
      },
    });

    // Générer JWT token
    const token = this.jwtService.sign({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
    });

    return {
      user,
      tenant,
      apiKey: apiKey.key,
      token,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    });

    return { user, tenant: user.tenant, token };
  }

  async validateApiKey(key: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key },
      include: { tenant: true },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Update lastUsedAt
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private generateApiKey(): string {
    return `pk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }
}
```

```typescript
// src/modules/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: { email: string; password: string; tenantName: string },
  ) {
    return this.authService.register(body.email, body.password, body.tenantName);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }
}
```

---

### 2. Billing Module (Stripe Integration)

```typescript
// src/modules/billing/billing.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createCustomer(tenantId: string, email: string, name: string) {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { tenantId },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customer.id },
    });

    return customer;
  }

  async createSubscription(
    tenantId: string,
    plan: 'STARTER' | 'BUSINESS' | 'ENTERPRISE',
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant.stripeCustomerId) {
      throw new Error('No Stripe customer found');
    }

    const priceId = this.getPriceId(plan);

    const subscription = await this.stripe.subscriptions.create({
      customer: tenant.stripeCustomerId,
      items: [
        {
          price: priceId,
        },
        {
          price: process.env.STRIPE_CONVERSATION_PRICE_ID, // Metered billing
        },
      ],
      metadata: { tenantId },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripeSubscriptionId: subscription.id,
        plan,
        status: 'ACTIVE',
      },
    });

    return subscription;
  }

  async recordUsage(tenantId: string, quantity: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant.stripeSubscriptionId) {
      return; // No subscription, no metering
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      tenant.stripeSubscriptionId,
    );

    const meteredItem = subscription.items.data.find(
      (item) => item.price.id === process.env.STRIPE_CONVERSATION_PRICE_ID,
    );

    if (meteredItem) {
      await this.stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
        quantity,
        timestamp: Math.floor(Date.now() / 1000),
      });
    }
  }

  private getPriceId(plan: string): string {
    const priceIds = {
      STARTER: process.env.STRIPE_STARTER_PRICE_ID,
      BUSINESS: process.env.STRIPE_BUSINESS_PRICE_ID,
      ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    };
    return priceIds[plan];
  }
}
```

---

### 3. Usage Module (Metering)

```typescript
// src/modules/usage/usage.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class UsageService {
  constructor(
    private prisma: PrismaService,
    private billingService: BillingService,
  ) {}

  async trackConversation(
    tenantId: string,
    sessionId: string,
    mode: 'TEXT' | 'HYBRID' | 'LIVE',
    costs: {
      sttCost?: number;
      llmCost?: number;
      ttsCost?: number;
    },
  ) {
    // Enregistrer la conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        sessionId,
        mode,
        tenantId,
        ...costs,
        totalCost: (costs.sttCost || 0) + (costs.llmCost || 0) + (costs.ttsCost || 0),
      },
    });

    // Mettre à jour l'usage du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.usage.upsert({
      where: {
        tenantId_date: {
          tenantId,
          date: today,
        },
      },
      update: {
        conversations: { increment: 1 },
      },
      create: {
        tenantId,
        date: today,
        conversations: 1,
      },
    });

    // Vérifier si overage et reporter à Stripe
    await this.checkOverageAndReport(tenantId);

    return conversation;
  }

  private async checkOverageAndReport(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    // Compter conversations du mois actuel
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyUsage = await this.prisma.usage.aggregate({
      where: {
        tenantId,
        date: { gte: startOfMonth },
      },
      _sum: {
        conversations: true,
      },
    });

    const totalConversations = monthlyUsage._sum.conversations || 0;
    const overage = Math.max(0, totalConversations - tenant.includedConversations);

    if (overage > 0) {
      // Reporter à Stripe (metered billing)
      await this.billingService.recordUsage(tenantId, overage);
    }
  }

  async getMonthlyUsage(tenantId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await this.prisma.usage.aggregate({
      where: {
        tenantId,
        date: { gte: startOfMonth },
      },
      _sum: {
        conversations: true,
        audioMinutes: true,
        apiCalls: true,
      },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const totalConversations = usage._sum.conversations || 0;
    const remaining = Math.max(0, tenant.includedConversations - totalConversations);
    const overage = Math.max(0, totalConversations - tenant.includedConversations);

    return {
      total: totalConversations,
      included: tenant.includedConversations,
      remaining,
      overage,
      audioMinutes: usage._sum.audioMinutes || 0,
      apiCalls: usage._sum.apiCalls || 0,
    };
  }
}
```

---

## 📡 API Endpoints

### Auth

```
POST   /api/auth/register          # Créer compte
POST   /api/auth/login             # Login
POST   /api/auth/refresh           # Refresh token
POST   /api/auth/forgot-password   # Reset password
```

### Tenants

```
GET    /api/tenants/me             # Mon tenant
PATCH  /api/tenants/me             # Mettre à jour
GET    /api/tenants/me/usage       # Usage mensuel
GET    /api/tenants/me/invoices    # Factures
```

### Billing

```
POST   /api/billing/subscribe      # Souscrire à un plan
POST   /api/billing/portal         # Stripe customer portal
GET    /api/billing/plans          # Liste des plans
POST   /api/billing/update-card    # Mettre à jour carte
```

### Domains

```
GET    /api/domains                # Liste domaines
POST   /api/domains                # Ajouter domaine
DELETE /api/domains/:id            # Supprimer domaine
POST   /api/domains/:id/verify     # Vérifier domaine
```

### API Keys

```
GET    /api/api-keys               # Liste API keys
POST   /api/api-keys               # Créer API key
DELETE /api/api-keys/:id           # Supprimer API key
```

### Analytics

```
GET    /api/analytics/conversations     # Conversations stats
GET    /api/analytics/engagement        # Taux d'engagement
GET    /api/analytics/top-queries       # Top queries
GET    /api/analytics/funnel            # Funnel analysis
```

### Webhooks (Stripe)

```
POST   /api/webhooks/stripe        # Stripe webhooks
```

---

## 🔐 Guards & Decorators

```typescript
// src/common/guards/tenant.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (!tenantId) return false;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    // Vérifier le statut
    if (tenant.status === 'SUSPENDED' || tenant.status === 'CANCELED') {
      return false;
    }

    request.tenant = tenant;
    return true;
  }
}
```

```typescript
// src/common/decorators/tenant.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
```

---

## 🎯 Variables d'Environnement

```env
# .env.example

# Server
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/domos_saas

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
STRIPE_CONVERSATION_PRICE_ID=price_...  # Metered billing

# Redis
REDIS_URL=redis://localhost:6379

# SendGrid
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@domos.ai

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=domos-uploads

# Sentry
SENTRY_DSN=https://...

# DomOS Core Server
DOMOS_CORE_URL=http://localhost:3000
```

---

## 📦 Package.json

```json
{
  "name": "domos-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "build": "nest build",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "migrate": "prisma migrate dev",
    "generate": "prisma generate",
    "seed": "ts-node prisma/seeds/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/config": "^3.1.1",
    "@nestjs/throttler": "^5.1.1",
    "@prisma/client": "^5.9.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1",
    "stripe": "^14.13.0",
    "redis": "^4.6.12",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.3.0",
    "@types/node": "^20.11.5",
    "@types/bcrypt": "^5.0.2",
    "@types/passport-jwt": "^4.0.0",
    "prisma": "^5.9.0",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2"
  }
}
```

---

✅ **Architecture NestJS complète pour le SaaS DomOS !**

**Voulez-vous que je développe un module spécifique en détail (Analytics, Webhooks, Admin Panel, etc.) ?** 🚀

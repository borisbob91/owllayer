import type { DomOSServerPlugin, ServerPluginContext } from '@domos/server';

// ============================================================
// PromotionsPlugin — DomOS Server Plugin
//
// Manages promo codes and flash sales server-side for the
// shopping demo (React). The LLM can call these tools during
// the checkout flow without any client-side modification.
//
// Installed with mode: 'trusted' — demonstrates feature_09
// capabilities manifest pattern with a pure in-memory plugin.
//
// Tools exposed (prefixed by the installer as
// @domos-plugins/demo-promotions/<name>):
//
//   get_current_promotions  — list all active promo codes + flash sale
//   apply_promo_code        — validate a code and compute the discount
//   get_flash_sale          — check if a flash sale is currently active
// ============================================================

// ============================================================
// Types
// ============================================================

export interface PromoCode {
  /** The code string the user types (case-insensitive). */
  code: string;
  /** Percentage discount, 1–100. */
  discountPercent: number;
  /** Optional minimum cart total (EUR) required to use this code. */
  minCartTotal?: number;
  /** Optional expiry timestamp (ms since epoch). No expiry if omitted. */
  expiresAt?: number;
  /** Human-readable label shown to the user. */
  description: string;
}

export interface FlashSaleConfig {
  /** Percentage discount applied during the flash sale. */
  discountPercent: number;
  /** Human-readable label, e.g. "Flash sale -30% — all items!". */
  label: string;
  /** ISO date string or timestamp when the flash sale starts. */
  startsAt: number;
  /** ISO date string or timestamp when the flash sale ends. */
  endsAt: number;
}

export interface PromotionsConfig {
  /** Promo codes available in the store. Defaults to 3 demo codes. */
  promoCodes?: PromoCode[];
  /** Optional active flash sale. No flash sale if omitted. */
  flashSale?: FlashSaleConfig;
}

// ============================================================
// Default demo promo codes
// ============================================================

const DEFAULT_PROMO_CODES: PromoCode[] = [
  {
    code: 'BIENVENUE10',
    discountPercent: 10,
    description: '10% off your first order — welcome gift',
  },
  {
    code: 'DOMOS20',
    discountPercent: 20,
    minCartTotal: 100,
    description: '20% off on orders over €100',
  },
  {
    code: 'FLASH50',
    discountPercent: 50,
    minCartTotal: 200,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // valid for 7 days from install
    description: '50% off on orders over €200 — limited time',
  },
];

// ============================================================
// Helpers
// ============================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isActive(code: PromoCode, now: number): boolean {
  return code.expiresAt === undefined || code.expiresAt > now;
}

// ============================================================
// Plugin definition
// ============================================================

export const PromotionsPlugin: DomOSServerPlugin<PromotionsConfig> = {
  meta: {
    name: '@domos-plugins/demo-promotions',
    version: '1.0.0',
    description:
      'Server-side promo codes and flash sales for the DomOS shopping demo. ' +
      'Demonstrates DomOSServerPlugin with capabilities manifest (feature_09).',
    capabilities: {
      // Pure in-memory plugin — no external I/O needed.
      network:    { allowDomains: [] },
      filesystem: {},
      env:        { allowKeys: [] },
      process:    { allowSpawn: false },
    },
  },

  setup(ctx: ServerPluginContext, config: PromotionsConfig): void {
    const promoCodes = config.promoCodes ?? DEFAULT_PROMO_CODES;
    // Normalise codes to uppercase for case-insensitive lookup.
    const codeMap = new Map<string, PromoCode>(
      promoCodes.map((c) => [c.code.toUpperCase(), c]),
    );
    const flashSale = config.flashSale ?? null;

    // --------------------------------------------------------
    // get_current_promotions
    // Returns all codes that are not yet expired, plus the
    // current flash sale if active.
    // --------------------------------------------------------
    ctx.registerTool('get_current_promotions', async (_args) => {
      const now = Date.now();
      const activeCodes = [...codeMap.values()]
        .filter((c) => isActive(c, now))
        .map(({ code, discountPercent, minCartTotal, description }) => ({
          code,
          discountPercent,
          minCartTotal,
          description,
        }));

      const flash = flashSale && now >= flashSale.startsAt && now < flashSale.endsAt
        ? { active: true, ...flashSale }
        : { active: false };

      return { promoCodes: activeCodes, flashSale: flash };
    });

    // --------------------------------------------------------
    // apply_promo_code
    // Validates a code against the cart total and returns the
    // computed discount amount and final price.
    // --------------------------------------------------------
    ctx.registerTool('apply_promo_code', async (args) => {
      const code = String(args['code'] ?? '').trim().toUpperCase();
      const cartTotal = Number(args['cartTotal'] ?? 0);

      if (!code) {
        return { valid: false, message: 'Please provide a promo code.' };
      }

      const promo = codeMap.get(code);
      if (!promo) {
        return { valid: false, message: `Code "${args['code']}" is not recognised.` };
      }

      const now = Date.now();
      if (!isActive(promo, now)) {
        return { valid: false, message: `Code "${promo.code}" has expired.` };
      }

      if (promo.minCartTotal !== undefined && cartTotal < promo.minCartTotal) {
        return {
          valid: false,
          message: `Code "${promo.code}" requires a minimum cart total of €${promo.minCartTotal.toFixed(2)} (current: €${cartTotal.toFixed(2)}).`,
        };
      }

      const discountAmount = round2(cartTotal * promo.discountPercent / 100);
      const finalTotal = round2(cartTotal - discountAmount);

      return {
        valid: true,
        code: promo.code,
        discountPercent: promo.discountPercent,
        discountAmount,
        finalTotal,
        message: `${promo.description} — you save €${discountAmount.toFixed(2)}!`,
      };
    });

    // --------------------------------------------------------
    // get_flash_sale
    // Returns the current flash sale state.
    // --------------------------------------------------------
    ctx.registerTool('get_flash_sale', async (_args) => {
      if (!flashSale) return { active: false };

      const now = Date.now();
      const active = now >= flashSale.startsAt && now < flashSale.endsAt;

      if (!active) return { active: false };

      return {
        active: true,
        discountPercent: flashSale.discountPercent,
        label: flashSale.label,
        endsAt: flashSale.endsAt,
        remainingMs: flashSale.endsAt - now,
      };
    });
  },
};

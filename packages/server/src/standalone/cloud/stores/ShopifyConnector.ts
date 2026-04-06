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
   * Utilise timingSafeEqual pour éviter les timing attacks.
   */
  verifyWebhook(body: Buffer, hmacHeader: string): boolean {
    const computed = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(body)
      .digest('base64');
    const computedBuffer = Buffer.from(computed);
    const headerBuffer = Buffer.from(hmacHeader);
    if (computedBuffer.length !== headerBuffer.length) return false;
    return crypto.timingSafeEqual(computedBuffer, headerBuffer);
  }

  /**
   * Appelle l'API REST Shopify Admin 2024-10.
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

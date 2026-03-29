export interface WooCommerceConfig {
  callbackUrl: string;
}

export class WooCommerceConnector {
  constructor(private config: WooCommerceConfig) {}

  /**
   * Génère l'URL d'autorisation WooCommerce (wc-auth flow).
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
   * Appelle l'API REST WooCommerce avec Basic auth.
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
   * Parse le payload de callback WooCommerce.
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

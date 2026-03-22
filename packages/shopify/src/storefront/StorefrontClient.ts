// TODO Sprint 3 — Shopify Storefront GraphQL client
// Wraps fetch() calls to the Storefront API

export class StorefrontClient {
  constructor(
    private readonly shopDomain: string,
    private readonly token: string,
  ) {}

  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(`https://${this.shopDomain}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.token,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`Storefront API error: ${res.status}`);
    const json = (await res.json()) as { data: T; errors?: unknown[] };
    if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
    return json.data;
  }
}

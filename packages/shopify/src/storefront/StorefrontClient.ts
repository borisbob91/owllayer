// Sprint 3 — Shopify Storefront GraphQL client
// Wraps fetch() calls to the Storefront API

import type { SearchProductsOptions, StorefrontProduct } from '../types.js';

/** Supported Shopify Storefront API versions. Add newer versions here as Shopify releases them. */
export type StorefrontApiVersion = '2026-01' | '2024-01';

export const STOREFRONT_API_VERSION_DEFAULT: StorefrontApiVersion = '2026-01';
export const STOREFRONT_API_VERSION_LEGACY: StorefrontApiVersion = '2024-01';

// ─── GraphQL query constants ─────────────────────────────────────────────────

const GQL_SEARCH_PRODUCTS = `
  query SearchProducts($query: String!, $first: Int!) {
    products(query: $query, first: $first) {
      edges {
        node {
          id handle title
          priceRange { minVariantPrice { amount currencyCode } }
          availableForSale productType tags vendor
          featuredImage { url altText }
          variants(first: 10) {
            edges { node { id title availableForSale price { amount currencyCode } } }
          }
        }
      }
    }
  }
`;

const GQL_GET_PRODUCT = `
  query GetProduct($handle: String!) {
    product(handle: $handle) {
      id handle title description
      priceRange { minVariantPrice { amount currencyCode } }
      compareAtPriceRange { minVariantPrice { amount } }
      availableForSale productType tags vendor
      featuredImage { url altText }
      images(first: 5) { edges { node { url altText } } }
      variants(first: 30) {
        edges {
          node {
            id title availableForSale quantityAvailable
            price { amount currencyCode }
            selectedOptions { name value }
          }
        }
      }
    }
  }
`;

const GQL_GET_RECOMMENDATIONS = `
  query GetProductRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
      id handle title
      priceRange { minVariantPrice { amount currencyCode } }
      availableForSale
      featuredImage { url altText }
      variants(first: 5) {
        edges { node { id title availableForSale price { amount currencyCode } } }
      }
    }
  }
`;

// ─── Client ──────────────────────────────────────────────────────────────────

export class StorefrontClient {
  readonly apiVersion: StorefrontApiVersion;

  constructor(
    private readonly shopDomain: string,
    private readonly token: string,
    apiVersion: StorefrontApiVersion = STOREFRONT_API_VERSION_DEFAULT,
  ) {
    this.apiVersion = apiVersion;
  }

  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(`https://${this.shopDomain}/api/${this.apiVersion}/graphql.json`, {
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

  /** Search products. Supports filtering by type, tag and price range (variants.price syntax). */
  async searchProducts(text: string, options: SearchProductsOptions = {}): Promise<StorefrontProduct[]> {
    const parts: string[] = [];
    if (text) parts.push(text);
    if (options.productType) parts.push(`product_type:"${options.productType}"`);
    if (options.tag) parts.push(`tag:"${options.tag}"`);
    if (options.minPrice != null) parts.push(`variants.price:>=${options.minPrice}`);
    if (options.maxPrice != null) parts.push(`variants.price:<=${options.maxPrice}`);
    const queryStr = parts.join(' AND ');
    const first = Math.min(options.limit ?? 5, 20);
    const data = await this.query<{ products: { edges: Array<{ node: StorefrontProduct }> } }>(
      GQL_SEARCH_PRODUCTS,
      { query: queryStr, first },
    );
    return data.products.edges.map(({ node }) => node);
  }

  /** Fetch full product detail by handle. Returns null if not found. */
  async getProduct(handle: string): Promise<StorefrontProduct | null> {
    const data = await this.query<{ product: StorefrontProduct | null }>(GQL_GET_PRODUCT, { handle });
    return data.product;
  }

  /**
   * Fetch product recommendations. Uses the Storefront API `productRecommendations` field
   * which returns an array directly (no edges/nodes).
   */
  async getProductRecommendations(productId: string): Promise<StorefrontProduct[]> {
    const data = await this.query<{ productRecommendations: StorefrontProduct[] }>(
      GQL_GET_RECOMMENDATIONS,
      { productId },
    );
    return data.productRecommendations;
  }
}

/**
 * StoreApiClient — minimal wrapper for WooCommerce Store API v1 (REST).
 * Handles nonce authentication for cart mutations.
 *
 * Sprint 1 implementation.
 */
export class StoreApiClient {
  constructor(
    private readonly base: string,
    private readonly nonce?: string,
  ) {}

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      headers: this._headers(),
    });
    if (!res.ok) throw new Error(`WC Store API ${path}: ${res.status}`);
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { ...this._headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, string>;
      throw new Error(err['message'] ?? `WC Store API ${path}: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async del<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'DELETE',
      headers: { ...this._headers(), 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) throw new Error(`WC Store API ${path}: ${res.status}`);
    return res.json() as Promise<T>;
  }

  private _headers(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.nonce) headers['Nonce'] = this.nonce;
    return headers;
  }
}

import { FirecrawlHttpError } from "./errors.ts";

const API_BASE = "https://api.firecrawl.dev/v1";

export type FirecrawlClientOptions = {
  apiKey: string;
  defaultTimeoutMs?: number;
};

/**
 * Thin typed wrapper over Firecrawl v1 HTTP API.
 * @template TResponse - Parsed JSON response body.
 */
export class FirecrawlClient {
  readonly #apiKey: string;
  readonly #defaultTimeoutMs: number;

  constructor(options: FirecrawlClientOptions) {
    this.#apiKey = options.apiKey;
    this.#defaultTimeoutMs = options.defaultTimeoutMs ?? 120_000;
  }

  async post<TResponse>(
    endpoint: `/${string}`,
    body: Record<string, unknown>,
    timeoutMs = this.#defaultTimeoutMs,
  ): Promise<TResponse> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new FirecrawlHttpError(res.status, text, endpoint);
    }
    return JSON.parse(text) as TResponse;
  }

  async get<TResponse>(
    endpoint: `/${string}`,
    timeoutMs = this.#defaultTimeoutMs,
  ): Promise<TResponse> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${this.#apiKey}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new FirecrawlHttpError(res.status, text, endpoint);
    }
    return JSON.parse(text) as TResponse;
  }
}
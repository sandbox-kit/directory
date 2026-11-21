export class FirecrawlHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    readonly endpoint: string,
  ) {
    super(`Firecrawl ${endpoint} → HTTP ${status}`);
    this.name = "FirecrawlHttpError";
  }
}

export class FirecrawlTimeoutError extends Error {
  constructor(readonly endpoint: string) {
    super(`Firecrawl ${endpoint} timed out`);
    this.name = "FirecrawlTimeoutError";
  }
}
import type { WebsiteStatus } from "@/schemas/provider";

export type HttpCheckResult = {
  website_status: WebsiteStatus;
  website_check: {
    input_url: string;
    checked_at: string;
    http_status?: number;
    final_url?: string;
    method: string;
    error?: string;
  };
  /** Registrable host of final URL after redirects. */
  finalHost: string;
  hostChanged: boolean;
};

const UA = "sandbox-directory-verify/1.0 (+https://sandbox.directory)";

function normHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function tryRequest(
  url: string,
  method: "HEAD" | "GET",
): Promise<Response> {
  return fetch(url, {
    method,
    redirect: "follow",
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(25_000),
  });
}

export async function checkWebsiteHttp(url: string): Promise<HttpCheckResult> {
  const input = url.trim();
  const checkedAt = new Date().toISOString();
  const inputHost = normHost(input);

  try {
    let res = await tryRequest(input, "HEAD");
    if (res.status === 405 || res.status === 501) {
      res = await tryRequest(input, "GET");
    }

    const finalUrl = res.url || input;
    const finalHost = normHost(finalUrl);
    let status: WebsiteStatus = "ok";
    if (res.status >= 400) status = "broken";
    else if (res.status >= 300) status = "redirect";

    if (status === "ok" && inputHost && finalHost && inputHost !== finalHost) {
      status = "redirect";
    }

    return {
      website_status: status,
      website_check: {
        input_url: input,
        checked_at: checkedAt,
        http_status: res.status,
        final_url: finalUrl,
        method: res.status === 405 ? "GET" : "HEAD",
      },
      finalHost,
      hostChanged: Boolean(inputHost && finalHost && inputHost !== finalHost),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const blocked = /certificate|ssl|tls|blocked|captcha|403|forbidden/i.test(
      message,
    );
    return {
      website_status: blocked ? "blocked" : "broken",
      website_check: {
        input_url: input,
        checked_at: checkedAt,
        method: "HEAD",
        error: message,
      },
      finalHost: inputHost,
      hostChanged: false,
    };
  }
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

export function resolveLogoUrl(
  website: string,
  candidate: string | undefined,
): string | undefined {
  const raw = candidate?.trim();
  if (!raw) return undefined;
  if (raw.startsWith("data:")) return undefined;
  try {
    return new URL(raw).href.replace(/\/$/, "");
  } catch {
    try {
      return new URL(raw, website).href.replace(/\/$/, "");
    } catch {
      return undefined;
    }
  }
}

export function isGeneratedFaviconUrl(url: string | undefined): boolean {
  return Boolean(
    url?.includes("google.com/s2/favicons") ||
    url?.includes("gstatic.com/faviconV2"),
  );
}

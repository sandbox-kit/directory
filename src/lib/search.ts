import type { SandboxProvider } from "@/types/provider";

function norm(s: string): string {
  return s.toLowerCase().trim();
}

export function filterProviders(
  list: SandboxProvider[],
  query: string,
): SandboxProvider[] {
  const q = norm(query);
  if (!q) {
    return list;
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  return list.filter((p) => {
    const haystack = norm(
      [
        p.name,
        p.display_name ?? "",
        p.slug,
        p.website,
        p.category_guess ?? "",
        ...(p.discovery ?? []),
        ...(p.isolation ?? []),
        ...(p.funding ?? []),
        ...(p.sources ?? []),
      ].join(" "),
    );
    return tokens.every((t) => haystack.includes(t));
  });
}

export function sortProvidersByName(
  list: SandboxProvider[],
): SandboxProvider[] {
  return [...list].sort((a, b) => {
    const an = a.display_name ?? a.name;
    const bn = b.display_name ?? b.name;
    return an.localeCompare(bn, undefined, { sensitivity: "base" });
  });
}

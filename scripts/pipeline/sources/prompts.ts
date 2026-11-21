export const SOURCE_EXTRACT_PROMPT =
  "Find pages that LIST multiple AI agent sandbox providers or projects (hosted, OSS, self-hosted, private-beta, stealth/waitlist). " +
  "Include: public directories, comparison tables, integration index pages, awesome lists, GitHub topic/catalog pages, " +
  "Show HN roundups, launch lists, vendor docs that enumerate sandbox partners, stealth/watchlist roundups, and blog landscape posts. " +
  "Do NOT include: a single vendor homepage, one-product docs only, unrelated marketplaces, or underlying runtime docs (Firecracker/gVisor/Kata) unless the page primarily lists sandbox products.";

export const SOURCE_SEARCH_CLASSIFY_PROMPT =
  "From this search result metadata, decide if the URL is likely to contain a LIST of multiple agent sandbox providers (not a single vendor). " +
  "Return sources[] with at most one entry for this page if it qualifies.";

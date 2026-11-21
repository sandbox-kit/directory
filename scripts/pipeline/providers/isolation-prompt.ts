import {
  ISOLATION_TECHNOLOGY_LABELS,
  ISOLATION_TECHNOLOGY_VALUES,
} from "@/schemas/isolation-technologies";

const list = ISOLATION_TECHNOLOGY_VALUES.map(
  (id) => `${id} (${ISOLATION_TECHNOLOGY_LABELS[id]})`,
).join("; ");

export const ISOLATION_EXTRACT_HINT =
  "isolation_technologies: pick all that apply from this fixed list only — " +
  list +
  ". " +
  "Document the isolation primitive (Firecracker, gVisor, Docker, Hyper-V, WASM isolate, etc.), not the cloud brand alone. " +
  "logo_url: absolute URL to the product logo or favicon on the official site when visible (og:image or header logo).";
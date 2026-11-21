import type { SandboxProvider } from "@/schemas/provider";

type OfferingType = NonNullable<SandboxProvider["offering_type"]>;
type Availability = NonNullable<SandboxProvider["availability"]>;
type LaunchStage = NonNullable<SandboxProvider["launch_stage"]>;

const OFFERING = new Set<string>([
  "hosted",
  "oss",
  "hybrid",
  "stealth",
  "unknown",
]);
const AVAIL = new Set<string>([
  "public",
  "private-beta",
  "self-hosted",
  "stealth",
  "waitlist",
  "unknown",
]);
const STAGE = new Set<string>(["ga", "beta", "alpha", "pre-launch", "unknown"]);

function pickEnum<T extends string>(
  value: string | undefined,
  allowed: Set<string>,
  fallback: T,
): T {
  const v = (value ?? "").trim().toLowerCase();
  return (allowed.has(v) ? v : fallback) as T;
}

export function normalizeOfferingType(raw?: string): OfferingType {
  return pickEnum(raw, OFFERING, "unknown");
}

export function normalizeAvailability(raw?: string): Availability {
  return pickEnum(raw, AVAIL, "unknown");
}

export function normalizeLaunchStage(raw?: string): LaunchStage {
  return pickEnum(raw, STAGE, "unknown");
}

export function categoryFromMetadata(
  offering: OfferingType,
  availability: Availability,
): string {
  if (offering === "oss" || availability === "self-hosted") {
    return "Open source / self-hosted sandbox";
  }
  if (offering === "stealth" || availability === "stealth") {
    return "Stealth / pre-launch sandbox";
  }
  if (availability === "private-beta" || availability === "waitlist") {
    return "Private beta / waitlist sandbox";
  }
  if (offering === "hybrid") return "Hybrid hosted + self-hosted sandbox";
  if (offering === "hosted") return "Hosted agent sandbox";
  return "Discovered";
}

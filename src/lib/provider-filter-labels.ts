import { SANDBOX_CAPABILITY_LABELS } from "@/schemas/sandbox-capabilities";
import { ISOLATION_TECHNOLOGY_LABELS } from "@/schemas/isolation-technologies";

export const OFFERING_LABELS: Record<string, string> = {
  hosted: "Hosted",
  oss: "Open source",
  hybrid: "Hybrid",
  stealth: "Stealth",
};

export const AVAILABILITY_LABELS: Record<string, string> = {
  public: "Public",
  "private-beta": "Private beta",
  "self-hosted": "Self-hosted",
  stealth: "Stealth",
  waitlist: "Waitlist",
};

export const LAUNCH_LABELS: Record<string, string> = {
  ga: "GA",
  beta: "Beta",
  alpha: "Alpha",
  "pre-launch": "Pre-launch",
};

export function capabilityLabel(id: string): string {
  return (
    SANDBOX_CAPABILITY_LABELS[id as keyof typeof SANDBOX_CAPABILITY_LABELS] ??
    id
  );
}

export function isolationLabel(id: string): string {
  return (
    ISOLATION_TECHNOLOGY_LABELS[
      id as keyof typeof ISOLATION_TECHNOLOGY_LABELS
    ] ?? id
  );
}

import type { SandboxProvider } from "@/types/provider";
import {
  AVAILABILITY_LABELS,
  LAUNCH_LABELS,
  OFFERING_LABELS,
  capabilityLabel,
  isolationLabel,
} from "@/lib/provider-filter-labels";
import { ISOLATION_TECHNOLOGY_LABELS } from "@/schemas/isolation-technologies";
import { SANDBOX_CAPABILITY_LABELS } from "@/schemas/sandbox-capabilities";

function Chip({ children }: { children: string }) {
  return (
    <span className="inline-flex max-w-full truncate rounded-md border border-sk-border bg-sk-bg/80 px-1.5 py-0.5 font-mono text-[0.625rem] tracking-[-0.03em] text-sk-muted sm:text-[0.6875rem]">
      {children}
    </span>
  );
}

type Props = { provider: SandboxProvider };

export function ProviderMetaChips({ provider }: Props) {
  const chips: string[] = [];

  if (provider.offering_type && provider.offering_type !== "unknown") {
    chips.push(
      OFFERING_LABELS[provider.offering_type] ?? provider.offering_type,
    );
  }
  if (provider.availability && provider.availability !== "unknown") {
    chips.push(
      AVAILABILITY_LABELS[provider.availability] ?? provider.availability,
    );
  }
  if (provider.launch_stage && provider.launch_stage !== "unknown") {
    chips.push(LAUNCH_LABELS[provider.launch_stage] ?? provider.launch_stage);
  }

  for (const c of provider.sandbox_capabilities ?? []) {
    chips.push(SANDBOX_CAPABILITY_LABELS[c] ?? capabilityLabel(c));
  }
  for (const t of provider.isolation_technologies ?? []) {
    chips.push(ISOLATION_TECHNOLOGY_LABELS[t] ?? isolationLabel(t));
  }
  for (const line of provider.isolation ?? []) {
    if (!chips.includes(line)) chips.push(line);
  }
  if (chips.length === 0) {
    return provider.category_guess ? (
      <p className="mt-1 text-[0.6875rem] text-sk-muted-2">
        {provider.category_guess}
      </p>
    ) : null;
  }

  return (
    <ul
      className="mt-1.5 flex flex-wrap gap-1"
      aria-label="Provider attributes"
    >
      {chips.map((label) => (
        <li key={label}>
          <Chip>{label}</Chip>
        </li>
      ))}
    </ul>
  );
}

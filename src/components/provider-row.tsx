import { memo } from "react";
import { displayDomain } from "@/lib/domain";
import { ProviderIcon } from "@/components/provider-icon";
import { providerTitle } from "@/lib/provider-display";
import type { SandboxProvider } from "@/types/provider";

type Props = {
  provider: SandboxProvider;
  index: number;
};

function ProviderRowComponent({ provider, index }: Props) {
  const title = providerTitle(provider);
  const domain = displayDomain(provider.website);

  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_3.75rem]">
      <a
        href={provider.website}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${title}, ${domain}, opens in new tab`}
        className="group grid grid-cols-[2.75rem_minmax(0,1fr)_2rem] items-center gap-x-3 border-b border-sk-border py-3.5 transition-colors hover:bg-sk-accent/60 focus:outline-none focus-visible:shadow-[inset_0_0_0_2px_rgb(183_182_174/0.28)] focus-visible:outline-none sm:grid-cols-[3rem_minmax(0,1fr)_2.25rem] sm:gap-x-4 sm:py-4"
      >
        <span
          className="w-full text-right font-mono text-[0.8125rem] tabular-nums tracking-[-0.04em] text-sk-muted-2 transition-colors group-hover:text-sk-muted"
          aria-hidden
        >
          {index + 1}
        </span>

        <span className="flex min-w-0 items-center gap-3">
          <ProviderIcon provider={provider} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-[520] leading-tight tracking-[-0.02em] text-sk-fg sm:text-base">
              {title}
            </span>
            <p className="mt-1 truncate font-mono text-[0.75rem] tracking-[-0.03em] text-sk-muted-2">
              {domain}
            </p>
          </span>
        </span>

        <span
          className="flex size-8 shrink-0 items-center justify-center text-sk-muted-2 transition-colors group-hover:text-sk-fg"
          aria-hidden
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0"
            aria-hidden
          >
            <path
              d="M5.25 10.75 10.25 5.75"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
            />
            <path
              d="M6.25 5.75h4v4"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </a>
    </li>
  );
}

export const ProviderRow = memo(ProviderRowComponent);

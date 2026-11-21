import { memo } from "react";
import { displayDomain } from "@/lib/domain";
import { ProviderIcon } from "@/components/provider-icon";
import { ProviderMetaChips } from "@/components/provider-meta-chips";
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
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_6rem] border-b border-sk-border py-3 sm:py-3.5 md:py-4">
      <article className="flex gap-2.5 sm:gap-3">
        <span
          className="w-7 shrink-0 pt-0.5 text-right font-mono text-[0.75rem] leading-none tabular-nums tracking-[-0.04em] text-sk-muted-2 sm:w-8 sm:text-[0.8125rem]"
          aria-hidden
        >
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <ProviderIcon provider={provider} />
            <div className="min-w-0 flex-1">
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex max-w-full items-center gap-1.5 text-[0.9375rem] font-[520] leading-snug tracking-[-0.02em] text-sk-fg hover:underline sm:text-base"
              >
                <span className="truncate">{title}</span>
                <span
                  className="shrink-0 text-sk-muted-2 group-hover:text-sk-fg"
                  aria-hidden
                >
                  ↗
                </span>
              </a>
              <p className="mt-0.5 truncate font-mono text-[0.6875rem] tracking-[-0.03em] text-sk-muted-2 sm:text-[0.75rem]">
                {domain}
              </p>
              <ProviderMetaChips provider={provider} />
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}

export const ProviderRow = memo(ProviderRowComponent);
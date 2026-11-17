import { useState } from "react";
import { DEFAULT_PROVIDER_LOGO, providerLogoSrc } from "@/lib/logo";
import type { SandboxProvider } from "@/types/provider";

const ICON_PX = 32;

const iconFrame =
  "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[5px] border border-sk-border bg-[#f5f5ee] sm:size-9";

function DefaultProviderLogo() {
  return (
    <img
      src={DEFAULT_PROVIDER_LOGO}
      alt=""
      width={28}
      height={28}
      className="size-6 rounded-[4px] object-contain sm:size-7"
      decoding="async"
    />
  );
}

type Props = {
  provider: SandboxProvider;
};

export function ProviderIcon({ provider }: Props) {
  const primary = providerLogoSrc(provider);
  const [failed, setFailed] = useState(false);

  if (!primary || failed) {
    return (
      <span className={iconFrame} aria-hidden>
        <DefaultProviderLogo />
      </span>
    );
  }

  return (
    <span className={iconFrame}>
      <img
        src={primary}
        alt=""
        width={ICON_PX}
        height={ICON_PX}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        className="max-h-[24px] max-w-[24px] object-contain sm:max-h-[28px] sm:max-w-[28px]"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

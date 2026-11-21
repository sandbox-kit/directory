import type { ReactNode } from "react";
import { LogoMark } from "@/components/logo-mark";
import {
  SANDBOX_KIT_DOCS,
  SANDBOX_KIT_NAME,
  SANDBOX_KIT_TAGLINE,
  SITE_CONTACT_EMAIL,
} from "@/lib/site";

const FEATURED_OPEN_SLOTS = 1;

function featuredSlotMailto(): string {
  return `mailto:${SITE_CONTACT_EMAIL}`;
}

function FeaturedProjectSlot({
  href,
  external,
  logo,
  title,
  description,
  actionLabel,
  variant = "filled",
}: {
  href: string;
  external?: boolean;
  logo: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  variant?: "filled" | "dashed";
}) {
  const isDashed = variant === "dashed";

  return (
    <li className="min-w-0 flex-1">
      <a
        href={href}
        {...(external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : undefined)}
        className={`group sk-interactive-focus flex w-full items-center gap-2.5 px-2.5 py-2 transition-[background-color] duration-200 sm:gap-3 sm:px-3.5 sm:py-2.5 ${
          isDashed ? "hover:bg-sk-elevated/40" : "hover:bg-sk-accent/80"
        }`}
        aria-label={
          external
            ? `${title}, ${description} — ${actionLabel}`
            : `${title} — ${actionLabel}`
        }
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          {logo}
          <span className="flex h-7 min-w-0 flex-col items-start justify-between text-left sm:h-8">
            <span className="max-w-full truncate text-[0.6875rem] font-[520] leading-none tracking-[-0.02em] text-sk-fg sm:text-[0.75rem]">
              {title}
            </span>
            <span className="max-w-full truncate text-[0.625rem] font-[450] leading-none tracking-[-0.012em] text-sk-muted sm:text-[0.6875rem]">
              {description}
            </span>
          </span>
        </span>
        <span
          className="ml-2 shrink-0 font-mono text-[0.6875rem] leading-none text-sk-muted-2 transition-colors group-hover:text-sk-muted sm:ml-3 sm:text-[0.625rem]"
          aria-hidden
        >
          <span className="sm:hidden">{external ? "↗" : "✉"}</span>
          <span className="hidden items-center gap-0.5 sm:inline-flex">
            <span>{actionLabel}</span>
            <span className="text-[0.6875rem] leading-none">
              {external ? "↗" : "✉"}
            </span>
          </span>
        </span>
      </a>
    </li>
  );
}

function AddYoursLogo() {
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-[5px] border border-dashed border-sk-muted/40 bg-sk-bg/50 text-sk-muted-2 transition-colors group-hover:border-sk-muted/55 group-hover:text-sk-muted sm:size-8"
      aria-hidden
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </span>
  );
}

/**
 * One wide rectangle, two slots — below search.
 */
export function FeaturedProjects() {
  const mailto = featuredSlotMailto();

  return (
    <section
      className="animate-hero-rise mt-4 w-full max-w-2xl sm:mt-5"
      style={{ animationDelay: "0.28s" }}
      aria-labelledby="featured-projects-heading"
    >
      <h2
        id="featured-projects-heading"
        className="mb-1.5 text-left text-[0.6875rem] font-[450] tracking-[-0.015em] text-sk-muted-2 sm:text-[0.6875rem]"
      >
        Featured
      </h2>
      <div className="overflow-hidden rounded-xl border border-sk-border bg-sk-elevated/80 shadow-[inset_0_1px_0_0_rgb(245_245_238/0.04)]">
        <ul className="flex list-none divide-x divide-sk-border">
          <FeaturedProjectSlot
            href={SANDBOX_KIT_DOCS}
            external
            title={SANDBOX_KIT_NAME}
            description={SANDBOX_KIT_TAGLINE}
            actionLabel="Docs"
            logo={
              <LogoMark
                title={SANDBOX_KIT_NAME}
                className="size-7 shrink-0 rounded-[5px] sm:size-8"
              />
            }
          />
          {Array.from({ length: FEATURED_OPEN_SLOTS }, (_, i) => (
            <FeaturedProjectSlot
              key={`featured-open-${i + 1}`}
              href={mailto}
              variant="dashed"
              title="Add yours"
              description="Request slot"
              actionLabel="Email"
              logo={<AddYoursLogo />}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}

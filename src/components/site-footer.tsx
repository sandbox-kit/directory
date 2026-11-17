import { GITHUB_ISSUES } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-12 text-center text-[0.875rem] font-[450] tracking-[-0.01em] text-sk-muted sm:mt-14">
      missing a provider?{" "}
      <a
        href={GITHUB_ISSUES}
        target="_blank"
        rel="noopener noreferrer"
        className="sk-interactive-focus rounded-sm text-sk-muted underline decoration-sk-border underline-offset-[0.2em] transition hover:text-sk-fg"
      >
        open an issue
      </a>
    </footer>
  );
}

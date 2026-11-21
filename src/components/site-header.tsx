import { BrandMark } from "@/components/brand-mark";
import { GitHubIcon } from "@/components/github-icon";
import { GITHUB_REPO } from "@/lib/site";

/** Fixed top bar like cursor.directory: full width, logo left in 1300px rail. */
export function SiteHeader() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b border-sk-border bg-sk-bg/92 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-325 items-center justify-between gap-3 px-4 text-[15px] sm:px-5 md:h-15 md:px-6">
        <BrandMark />
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          className="sk-interactive-focus inline-flex shrink-0 items-center rounded-md p-2 text-sk-muted transition hover:text-sk-fg"
          aria-label="sandbox-kit/directory on GitHub"
        >
          <GitHubIcon className="size-5 text-current" />
        </a>
      </div>
    </div>
  );
}

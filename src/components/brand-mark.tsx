import { Link } from "react-router-dom";
import { LogoMark } from "@/components/logo-mark";

/** Domain lockup: mark + sandbox.directory (like cursor.directory). */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      tabIndex={-1}
      aria-label="sandbox.directory home"
      className={`inline-flex min-w-0 items-center gap-2.5 rounded-md leading-none text-sk-fg transition hover:opacity-90 sm:gap-3 ${className}`}
    >
      <LogoMark
        title="sandbox.directory"
        className="size-6 rounded-[4px] sm:size-7"
      />
      <span className="inline-flex min-w-0 items-baseline truncate text-[14px] tracking-[-0.03em] sm:text-[15px]">
        <span className="font-[560] text-sk-fg">sandbox</span>
        <span className="font-[560] text-sk-fg">.</span>
        <span className="font-[450] text-sk-muted">directory</span>
      </span>
    </Link>
  );
}

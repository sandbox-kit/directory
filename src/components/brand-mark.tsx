import { Link } from "react-router-dom";
import { LogoMark } from "@/components/logo-mark";

/** Domain lockup: mark + sandbox.directory (like cursor.directory). */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="sandbox.directory home"
      className={`sk-interactive-focus inline-flex items-center gap-3 rounded-md leading-none text-sk-fg transition hover:opacity-90 ${className}`}
    >
      <LogoMark
        title="sandbox.directory"
        className="size-6 shrink-0 rounded-[4px] sm:size-7"
      />
      <span className="inline-flex items-baseline whitespace-nowrap text-[15px] tracking-[-0.03em]">
        <span className="font-[560] text-sk-fg">sandbox</span>
        <span className="font-[560] text-sk-fg">.</span>
        <span className="font-[450] text-sk-muted">directory</span>
      </span>
    </Link>
  );
}

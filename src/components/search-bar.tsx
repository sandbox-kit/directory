import { memo, useId } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
  inputId: string;
};

function SearchBarComponent({
  value,
  onChange,
  resultCount,
  totalCount,
  inputId,
}: Props) {
  const hintId = useId();
  const statusId = useId();
  const describedBy =
    value.trim().length > 0 ? `${hintId} ${statusId}` : hintId;

  return (
    <div role="search" className="w-full max-w-2xl">
      <label htmlFor={inputId} className="sr-only">
        Search sandbox providers
      </label>
      <p id={hintId} className="sr-only">
        Search among {totalCount} providers by name, domain, or category
      </p>
      <div className="relative">
        <span
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sk-muted-2"
          aria-hidden="true"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          id={inputId}
          name="q"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search sandboxes, vendors, categories…"
          enterKeyHint="search"
          autoComplete="off"
          inputMode="search"
          className="sk-field-focus w-full rounded-full border border-sk-border bg-sk-elevated py-3.5 pl-11 pr-4 text-[1rem] font-[450] leading-normal tracking-[-0.015em] text-sk-fg shadow-none ring-0 outline-none transition-[border-color,box-shadow] placeholder:font-[400] placeholder:text-sk-muted-2"
          spellCheck={false}
          aria-describedby={describedBy}
        />
      </div>
      <p
        id={statusId}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {value.trim().length > 0
          ? `${resultCount} of ${totalCount} providers match your search`
          : ""}
      </p>
    </div>
  );
}

export const SearchBar = memo(SearchBarComponent);

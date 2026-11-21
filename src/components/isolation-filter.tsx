import { memo } from "react";
import {
  ISOLATION_FILTER_GROUPS,
  type IsolationFilterGroupId,
} from "@/lib/isolation-filter-groups";

type Props = {
  value: string;
  options: IsolationFilterGroupId[];
  onChange: (value: string) => void;
};

function IsolationFilterComponent({ value, options, onChange }: Props) {
  if (options.length === 0) return null;

  const labelById = new Map(
    ISOLATION_FILTER_GROUPS.map((g) => [g.id, g.label] as const),
  );

  const tabs = [
    { id: "", label: "All", title: "All isolation types" },
    ...options.map((id) => ({
      id,
      label: labelById.get(id) ?? id,
      title: labelById.get(id) ?? id,
    })),
  ];

  return (
    <div className="border-b border-sk-border">
      <div
        role="tablist"
        aria-label="Filter by isolation technology"
        className="flex w-full min-w-0 flex-nowrap items-end gap-1 sm:gap-2"
      >
        {tabs.map((tab) => {
          const selected = value === tab.id;
          return (
            <button
              key={tab.id || "all"}
              type="button"
              role="tab"
              aria-selected={selected}
              title={tab.title}
              onClick={() => onChange(tab.id)}
              className={[
                "sk-interactive-focus -mb-px min-w-0 flex-1 truncate border-b-2 pb-2 pt-0.5 text-center text-[0.6875rem] font-[450] tracking-[-0.02em] transition-colors sm:text-[0.75rem]",
                selected
                  ? "border-sk-fg text-sk-fg"
                  : "border-transparent text-sk-muted-2 hover:text-sk-muted",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const IsolationFilter = memo(IsolationFilterComponent);

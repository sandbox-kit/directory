import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

export function PageError() {
  const error = useRouteError();
  let title = "Something went wrong";
  let detail = "Refresh the page or return to the directory.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    detail = typeof error.data === "string" ? error.data : detail;
  } else if (error instanceof Error) {
    detail = error.message;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6 text-center">
      <div role="alert">
        <h1 className="text-[1.75rem] font-[560] leading-tight tracking-[-0.035em] text-sk-fg">
          {title}
        </h1>
        <p className="mt-4 max-w-[36ch] text-pretty text-[0.9375rem] font-[450] leading-relaxed tracking-[-0.01em] text-sk-muted">
          {detail}
        </p>
      </div>
      <Link
        to="/"
        className="sk-interactive-focus rounded-lg border border-sk-border bg-sk-elevated px-4 py-2.5 text-sm font-medium text-sk-fg transition hover:border-sk-muted/40 hover:bg-sk-accent"
      >
        Back to directory
      </Link>
    </div>
  );
}

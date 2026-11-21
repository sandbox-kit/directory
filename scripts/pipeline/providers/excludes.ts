const EXCLUDE_URL_SUBSTR = [
  "computesdk.com",
  "vibekit.sh",
  "theagentstack.dev",
  "github.com/actions",
  "github.com/firecracker-microvm/firecracker",
  "github.com/google/gvisor",
  "github.com/bytecodealliance/wasmtime",
  "github.com/containers/bubblewrap",
  "github.com/kata-containers/kata-containers",
  "agentsandbox.net",
  "awesome.re/badge",
  "towardsdev.com",
  "youtube.com/watch",
  "pypi.org/project/",
  "crates.io/crates/",
  "agentsandboxes.fyi",
  "boxyard.dev",
  "sandboxindex.dev",
  "roost.guide",
  "infraforagents.com",
  "agentsandboxes.org",
  "comparesandboxes.com",
  "producthunt.com",
  "alternativeto.net",
  "stackshare.io",
  "saashub.com",
  "news.ycombinator.com",
  "github.com/sindresorhus",
  "github.com/topics/",
  "wikipedia.org",
  "towardsdatascience.com",
  "dev.to",
  "hashnode.dev",
  "buttondown.email",
] as const;

const EXCLUDE_NAME_RE =
  /^(Firecracker|gVisor|Wasmtime|Wasmer|Kata Containers|Bubblewrap|libkrun|Pyodide|ComputeSDK|VibeKit|containerd|runc|QEMU)\b/i;

export function normDomain(url: string): string {
  if (!url) return "";
  let u = url.toLowerCase().replace(/\/$/, "");
  if (u.startsWith("git+")) u = u.slice(4);
  u = u.split("://").pop() ?? u;
  u = u.split("/")[0] ?? "";
  return u.replace(/^www\./, "");
}

export function isExcluded(url: string, name: string): boolean {
  if (EXCLUDE_NAME_RE.test(name.trim())) return true;
  const low = url.toLowerCase();
  return EXCLUDE_URL_SUBSTR.some((x) => low.includes(x));
}

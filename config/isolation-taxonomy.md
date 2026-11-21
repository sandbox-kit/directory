# Isolation technology taxonomy

Structured field: `isolation_technologies[]` on each provider.  
Human-readable mirror: `isolation[]` (built on enrich from tech + legacy text).

| ID                     | Label                          |
| ---------------------- | ------------------------------ |
| `firecracker`          | Firecracker microVM            |
| `gvisor`               | gVisor                         |
| `container`            | Container sandbox              |
| `docker`               | Docker containers              |
| `kvm`                  | KVM hardware VM                |
| `hyperv`               | Hyper-V isolation              |
| `cloud_hypervisor`     | Cloud Hypervisor               |
| `kata`                 | Kata containers                |
| `webcontainers`        | WebContainers                  |
| `wasm_isolate`         | WASM / isolate runtime         |
| `browser_isolation`    | Browser isolation              |
| `apple_virtualization` | Apple Virtualization.framework |
| `sysbox`               | Sysbox                         |
| `runc`                 | runc container                 |
| `virtual_desktop`      | Virtual desktop                |
| `remote_browser`       | Remote browser                 |
| `managed_runtime`      | Managed sandbox runtime        |

Firecrawl **extract** and **reconcile** also request `logo_url` (official logo; enrich falls back to Google favicon).

Definitions: `src/schemas/isolation-technologies.ts`.

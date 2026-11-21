# Sandbox capability taxonomy

Used by Firecrawl extract + reconcile (`sandbox_capabilities[]` on each provider).

| ID          | Typical offering                                                   |
| ----------- | ------------------------------------------------------------------ |
| `linux`     | Isolated Linux shell / code execution (VM or container)            |
| `windows`   | Windows Server VM or Hyper-V-isolated Windows workloads            |
| `macos`     | macOS VMs (Apple Silicon, Xcode, signing)                          |
| `browser`   | Headless or remote browser (Playwright, CDP)                       |
| `desktop`   | Full GUI / computer-use (VNC, RDP, noVNC)                          |
| `microvm`   | Hardware VM boundary (Firecracker, KVM microVMs, Cloud Hypervisor) |
| `container` | OCI / Docker namespace isolation without full VM                   |
| `gvisor`    | gVisor / runsc userspace-kernel sandboxes                          |
| `wasm`      | WebAssembly or V8 isolate runtimes                                 |
| `ci`        | Ephemeral CI / GitHub Actions–style isolated runners               |
| `gpu`       | GPU-attached sandboxes (training, inference, RL)                   |
| `mobile`    | iOS / Android device or emulator sandboxes                         |
| `edge`      | Edge worker isolates (e.g. Workers + Containers)                   |

Canonical definitions live in `src/schemas/sandbox-capabilities.ts`.

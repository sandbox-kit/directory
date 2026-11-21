import {
  SANDBOX_CAPABILITY_LABELS,
  SANDBOX_CAPABILITY_VALUES,
} from "@/schemas/sandbox-capabilities";

const capabilityList = SANDBOX_CAPABILITY_VALUES.map(
  (id) => `${id} (${SANDBOX_CAPABILITY_LABELS[id]})`,
).join("; ");

export const CAPABILITY_EXTRACT_HINT =
  "sandbox_capabilities: pick all that apply from this fixed list only — " +
  capabilityList +
  ". " +
  "linux = isolated Linux shell/code; windows/macos = those OS VMs; browser = headless/remote browser; " +
  "desktop = full GUI / computer-use (VNC/RDP); microvm = Firecracker/KVM hardware VMs; container = OCI/Docker; " +
  "gvisor = gVisor/runsc; wasm = WASM/V8 isolates; ci = ephemeral CI/GitHub Actions-style runners; " +
  "gpu = GPU-attached sandboxes; mobile = device/emulator farms; edge = Workers/edge isolates. " +
  "Omit tags the product does not clearly offer.";

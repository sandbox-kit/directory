#!/usr/bin/env node
/**
 * skills CLI installs to .agents/skills by default; Cursor reads project skills
 * from .cursor/skills/. Move copies after `npx skills add ... --agent cursor --copy`.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const from = join(root, ".agents", "skills");
const to = join(root, ".cursor", "skills");

if (!existsSync(from)) {
  process.exit(0);
}

mkdirSync(to, { recursive: true });

for (const name of readdirSync(from)) {
  const src = join(from, name);
  const dest = join(to, name);
  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
}

rmSync(join(root, ".agents"), { recursive: true, force: true });
console.log("Moved skills from .agents/skills → .cursor/skills");

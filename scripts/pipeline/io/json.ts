import { readFileSync, writeFileSync } from "node:fs";

export function readJsonFile<T>(absolutePath: string): T {
  const raw = readFileSync(absolutePath, "utf8");
  return JSON.parse(raw) as T;
}

export function writeJsonFile<T>(absolutePath: string, data: T): void {
  writeFileSync(absolutePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = resolve(projectRoot, "dist");

if (
  dirname(distDirectory) !== projectRoot ||
  !distDirectory.endsWith(`${process.platform === "win32" ? "\\" : "/"}dist`)
) {
  throw new Error(`Refusing to remove unexpected path: ${distDirectory}`);
}

rmSync(distDirectory, { recursive: true, force: true });

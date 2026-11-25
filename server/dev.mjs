import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const children = [
  spawn(process.execPath, ["server/index.mjs"], { cwd: root, stdio: "inherit" }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], { cwd: root, stdio: "inherit" }),
];

function stop() {
  for (const child of children) child.kill();
  process.exit(0);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      for (const other of children) other.kill();
      process.exit(code);
    }
  });
}

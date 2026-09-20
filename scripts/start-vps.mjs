import { spawn, spawnSync } from "node:child_process";

const port = process.env.PORT ?? "4173";
const host = process.env.HOST ?? "0.0.0.0";

const database = spawnSync(process.execPath, ["scripts/db-init.mjs"], {
  env: process.env,
  stdio: "inherit",
});

if (database.status !== 0) {
  process.exit(database.status ?? 1);
}

const args = [
  "--import",
  "./scripts/sites-env.mjs",
  "./node_modules/wrangler/bin/wrangler.js",
  "dev",
  "--config",
  "dist/server/wrangler.json",
  "--local",
  "--persist-to",
  ".wrangler/state",
  "--ip",
  host,
  "--inspector-port",
  "0",
  "--port",
  port,
];

const child = spawn(process.execPath, args, {
  env: process.env,
  stdio: "inherit",
});

const forwardSignal = (signal) => child.kill(signal);
process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

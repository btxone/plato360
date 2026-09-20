import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  [
    "--import",
    "./scripts/sites-env.mjs",
    "./node_modules/wrangler/bin/wrangler.js",
    "d1",
    "execute",
    "DB",
    "--local",
    "--persist-to",
    ".wrangler/state",
    "--file",
    "db/seed.sql",
    "--config",
    "dist/server/wrangler.json",
    "--yes",
  ],
  {
    env: process.env,
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);

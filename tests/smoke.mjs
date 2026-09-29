import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const routes = [
  { path: "/", status: 200, text: "Plato360" },
  { path: "/carta", status: 200, text: "Plato360" },
  { path: "/panel", status: 200 },
  { path: "/carta/pedido", status: 200, text: "MI PEDIDO" },
  { path: "/carta/proximamente", status: 200, text: "DECIDES TÚ" },
  { path: "/api/health", status: 200, text: '"status":"ok"' },
  { path: "/carta/tradicional", status: 200 },
  { path: "/carta/restaurante", status: 404 },
];

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function request(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(`${baseUrl}${path}`, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function isServerReady() {
  try {
    const response = await request("/");
    return response.ok;
  } catch {
    return false;
  }
}

async function startLocalServerIfNeeded() {
  if (await isServerReady()) return null;

  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const server = spawn(command, ["run", "dev"], {
    cwd: projectRoot,
    stdio: "ignore",
    windowsHide: true,
    shell: process.platform === "win32",
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await isServerReady()) return server;
    if (server.exitCode !== null) {
      throw new Error(`El servidor de desarrollo terminó con código ${server.exitCode}.`);
    }
    await wait(500);
  }

  server.kill();
  throw new Error(`No se pudo levantar el servidor en ${baseUrl}.`);
}

let startedServer;
try {
  startedServer = await startLocalServerIfNeeded();
  const failures = [];

  for (const route of routes) {
    try {
      const response = await request(route.path);
      const body = await response.text();
      if (response.status !== route.status) {
        failures.push(`${route.path}: status esperado ${route.status}, recibido ${response.status}`);
      } else if (route.text && !body.includes(route.text)) {
        failures.push(`${route.path}: no contiene el texto esperado "${route.text}"`);
      }
    } catch (error) {
      failures.push(`${route.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures.length > 0) {
    console.error("Pruebas de humo fallidas:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`Pruebas de humo OK: ${routes.length} rutas verificadas en ${baseUrl}.`);
  }
} finally {
  if (startedServer) startedServer.kill();
}

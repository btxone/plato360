import { spawn } from "node:child_process";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:5173";
const projectRoot = new URL("..", import.meta.url);
const routes = [
  { path: "/", text: "Hacé que tus platos se vendan" },
  { path: "/carta", text: "Así se ve" },
  { path: "/carta/tradicional", text: "Todo lo rico" },
  { path: "/carta/plato/smash-trufa", text: "Smash Trufa" },
  { path: "/carta/pedido", text: "Lo que te" },
  { path: "/carta/proximamente", text: "TU DECIDES" },
  { path: "/carta/proximamente/burger-bbq-ahumada", text: "Burger BBQ Ahumada" },
  { path: "/carta/restaurante", text: "Qué está pasando en tu carta" },
  { path: "/carta/restaurante/pruebas", text: "Qué plato debería llegar a la carta" },
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
      if (response.status !== 200) {
        failures.push(`${route.path}: status esperado 200, recibido ${response.status}`);
      } else if (!body.includes(route.text)) {
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

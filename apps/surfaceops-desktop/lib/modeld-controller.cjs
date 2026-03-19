const http = require("node:http");
const { once } = require("node:events");
const { spawn } = require("node:child_process");

const {
  createDefaultRuntimeStatus,
} = require("@surfaces/surfaceops-desktop-bridge");

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl ?? "").trim().replace(/\/+$/, "");
}

async function readJsonRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

function sendJson(response, statusCode, payload) {
  const serialized = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(serialized),
  });
  response.end(serialized);
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "content-type": "text/plain; charset=utf-8",
    "content-length": Buffer.byteLength(message),
  });
  response.end(message);
}

async function waitForUrl(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Unexpected status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

function createSurfaceOpsModeldController(options) {
  const host = options.host ?? "127.0.0.1";
  const port = options.port;
  const backendPort = options.backendPort;
  const waitTimeoutMs = options.waitTimeoutMs ?? 30_000;
  const logger = options.logger ?? console;
  let server = null;
  let backendProcess = null;
  let currentEntry = null;
  let currentModelPath = null;
  let runtimeStatus = createDefaultRuntimeStatus({
    baseUrl: `http://${host}:${port}/v1`,
    backendBaseUrl: `http://${host}:${backendPort}/v1`,
  });

  function getRuntimeStatus() {
    return { ...runtimeStatus };
  }

  function updateRuntimeStatus(nextStatus) {
    runtimeStatus = {
      ...runtimeStatus,
      ...nextStatus,
      updatedAt: new Date().toISOString(),
    };
    return getRuntimeStatus();
  }

  function getProxyTargetBaseUrl() {
    const explicitTarget = normalizeBaseUrl(options.getTargetBaseUrl?.());
    if (explicitTarget) {
      return explicitTarget;
    }
    return normalizeBaseUrl(runtimeStatus.backendBaseUrl);
  }

  async function handleRequest(request, response) {
    const requestUrl = new URL(request.url ?? "/", `http://${host}:${port}`);

    if (request.method === "GET" && (requestUrl.pathname === "/health" || requestUrl.pathname === "/healthz")) {
      sendJson(response, runtimeStatus.healthy ? 200 : 503, {
        ok: runtimeStatus.healthy,
        runtimeStatus,
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/v1/models") {
      sendJson(response, 200, {
        object: "list",
        data: currentEntry
          ? [
              {
                id: currentEntry.id,
                object: "model",
                owned_by: "surfaceops",
              },
            ]
          : [],
      });
      return;
    }

    if (request.method !== "POST" || requestUrl.pathname !== "/v1/responses") {
      sendText(response, 404, "Not found");
      return;
    }

    if (!runtimeStatus.healthy || !currentEntry) {
      sendJson(response, 503, {
        error: {
          message: runtimeStatus.errorMessage || "SurfaceOps local model runtime is not ready.",
          type: "surfaceops_modeld_unavailable",
        },
      });
      return;
    }

    const targetBaseUrl = getProxyTargetBaseUrl();
    if (!targetBaseUrl) {
      sendJson(response, 503, {
        error: {
          message: "SurfaceOps backend target is not configured.",
          type: "surfaceops_modeld_unavailable",
        },
      });
      return;
    }

    try {
      const body = await readJsonRequestBody(request);
      const proxiedBody = {
        ...body,
        model: currentEntry.id,
      };

      const upstream = await fetch(`${targetBaseUrl}/responses`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(proxiedBody),
      });

      const text = await upstream.text();
      response.writeHead(upstream.status, {
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      });
      response.end(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateRuntimeStatus({
        phase: "error",
        healthy: false,
        errorMessage: message,
      });
      sendJson(response, 500, {
        error: {
          message,
          type: "surfaceops_modeld_proxy_error",
        },
      });
    }
  }

  async function ensureServer() {
    if (server) {
      return;
    }
    server = http.createServer((request, response) => {
      void handleRequest(request, response);
    });
    server.listen(port, host);
    await once(server, "listening");
  }

  function stopBackendProcess() {
    if (!backendProcess || backendProcess.killed) {
      backendProcess = null;
      return;
    }
    backendProcess.kill("SIGTERM");
    backendProcess = null;
  }

  async function start(modelEntry, modelPath) {
    await ensureServer();
    stopBackendProcess();
    currentEntry = modelEntry ?? null;
    currentModelPath = modelPath ?? null;

    const explicitTarget = normalizeBaseUrl(options.getTargetBaseUrl?.());
    if (!currentEntry || !currentModelPath) {
      updateRuntimeStatus({
        phase: "unconfigured",
        modelId: null,
        healthy: false,
        errorMessage: "No SurfaceOps model is installed yet.",
      });
      return getRuntimeStatus();
    }

    updateRuntimeStatus({
      phase: "starting",
      modelId: currentEntry.id,
      healthy: false,
      errorMessage: null,
    });

    try {
      if (explicitTarget) {
        updateRuntimeStatus({
          backendBaseUrl: explicitTarget.endsWith("/v1") ? explicitTarget : `${explicitTarget}/v1`,
        });
        await waitForUrl(`${explicitTarget.replace(/\/+$/, "")}/health`, waitTimeoutMs).catch(async () => {
          await waitForUrl(`${explicitTarget.replace(/\/+$/, "")}/v1/models`, waitTimeoutMs);
        });
        updateRuntimeStatus({
          phase: "ready",
          healthy: true,
          errorMessage: null,
        });
        return getRuntimeStatus();
      }

      const backendCommand = options.buildBackendCommand?.({
        host,
        backendPort,
        modelEntry: currentEntry,
        modelPath: currentModelPath,
      });

      if (!backendCommand?.command) {
        updateRuntimeStatus({
          phase: "error",
          healthy: false,
          errorMessage: "SurfaceOps could not resolve a bundled llama.cpp backend.",
        });
        return getRuntimeStatus();
      }

      backendProcess = spawn(backendCommand.command, backendCommand.args ?? [], {
        cwd: backendCommand.cwd,
        env: backendCommand.env,
        stdio: "inherit",
        shell: process.platform === "win32",
      });

      backendProcess.on("exit", (code, signal) => {
        if (runtimeStatus.phase === "ready" || runtimeStatus.phase === "starting") {
          updateRuntimeStatus({
            phase: "error",
            healthy: false,
            errorMessage: `SurfaceOps backend exited unexpectedly (${signal || code || "unknown"}).`,
          });
        }
        backendProcess = null;
      });

      const backendBaseUrl = `http://${host}:${backendPort}`;
      updateRuntimeStatus({
        backendBaseUrl: `${backendBaseUrl}/v1`,
      });

      await waitForUrl(`${backendBaseUrl}/health`, waitTimeoutMs).catch(async () => {
        await waitForUrl(`${backendBaseUrl}/v1/models`, waitTimeoutMs);
      });

      updateRuntimeStatus({
        phase: "ready",
        healthy: true,
        errorMessage: null,
      });
      return getRuntimeStatus();
    } catch (error) {
      logger.error?.(error);
      updateRuntimeStatus({
        phase: "error",
        healthy: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return getRuntimeStatus();
    }
  }

  async function stop() {
    stopBackendProcess();
    currentEntry = null;
    currentModelPath = null;
    updateRuntimeStatus({
      phase: "unconfigured",
      modelId: null,
      healthy: false,
      errorMessage: null,
    });

    if (!server) {
      return;
    }
    const activeServer = server;
    server = null;
    await new Promise((resolve, reject) => {
      activeServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  return {
    baseUrl: `http://${host}:${port}/v1`,
    start,
    stop,
    getRuntimeStatus,
  };
}

module.exports = {
  createSurfaceOpsModeldController,
};

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";

import { createSurfaceOpsModeldController } from "../lib/modeld-controller.cjs";

async function createBackendServer() {
  let lastRequestBody = null;
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && requestUrl.pathname === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/responses") {
      const chunks = [];
      for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      lastRequestBody = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        id: "resp_123",
        object: "response",
        output_text: "BENCHMARK_READY",
        output: [],
      }));
      return;
    }

    response.writeHead(404);
    response.end();
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not resolve backend server address.");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
    getLastRequestBody: () => lastRequestBody,
  };
}

async function reservePort() {
  const server = http.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not reserve a port.");
  }
  const { port } = address;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  return port;
}

test("surfaceops-modeld exposes model metadata and proxies responses to the active backend", async () => {
  const backend = await createBackendServer();
  const port = await reservePort();
  const backendPort = await reservePort();
  const controller = createSurfaceOpsModeldController({
    port,
    backendPort,
    waitTimeoutMs: 5_000,
    getTargetBaseUrl: () => backend.baseUrl,
  });

  try {
    const runtimeStatus = await controller.start({ id: "balanced" }, "/tmp/balanced.gguf");
    assert.equal(runtimeStatus.phase, "ready");
    assert.equal(runtimeStatus.healthy, true);

    const modelsResponse = await fetch(`${controller.baseUrl}/models`);
    const modelsPayload = await modelsResponse.json();
    assert.equal(modelsResponse.status, 200);
    assert.deepEqual(modelsPayload.data.map((entry) => entry.id), ["balanced"]);

    const response = await fetch(`${controller.baseUrl}/responses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "ignored",
        input: "ping",
      }),
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.output_text, "BENCHMARK_READY");
    assert.equal(backend.getLastRequestBody()?.model, "balanced");
    assert.equal(backend.getLastRequestBody()?.input, "ping");
  } finally {
    await controller.stop();
    await new Promise((resolve, reject) => {
      backend.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
});

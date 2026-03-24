import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { once } from "node:events";
import { createHash } from "node:crypto";

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

async function reservePort(host = "127.0.0.1") {
  const server = http.createServer();
  server.listen(0, host);
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

export function buildSurfaceOpsModelDownloadOverrides({ baseUrl, artifacts }) {
  const overrides = {};
  for (const [modelId, artifact] of Object.entries(artifacts ?? {})) {
    overrides[modelId] = {
      downloadUrl: `${String(baseUrl).replace(/\/+$/, "")}/models/${artifact.filename}`,
      sha256: artifact.sha256,
      sizeBytes: artifact.sizeBytes,
      filename: artifact.filename,
    };
  }
  return overrides;
}

export async function writeSurfaceOpsModelDownloadOverrides({ filePath, baseUrl, artifacts }) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(
    filePath,
    JSON.stringify(buildSurfaceOpsModelDownloadOverrides({ baseUrl, artifacts }), null, 2),
    "utf8",
  );
}

export async function createSurfaceOpsMockRuntimeServer({
  rootDir,
  host = "127.0.0.1",
  port = null,
} = {}) {
  const resolvedRootDir = path.resolve(rootDir ?? process.cwd());
  const modelDir = path.join(resolvedRootDir, "models");
  await fsp.mkdir(modelDir, { recursive: true });

  const artifacts = {};
  for (const modelId of ["starter", "balanced", "quality"]) {
    const filename = `${modelId}.gguf`;
    const contents = Buffer.from(`mock-${modelId}-artifact`, "utf8");
    await fsp.writeFile(path.join(modelDir, filename), contents);
    artifacts[modelId] = {
      filename,
      sha256: sha256(contents),
      sizeBytes: contents.length,
    };
  }

  const resolvedPort = port ?? await reservePort(host);
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://${host}:${resolvedPort}`);

    if (request.method === "GET" && requestUrl.pathname === "/health") {
      response.writeHead(200, {
        "content-type": "application/json",
        connection: "close",
      });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/v1/models") {
      response.writeHead(200, {
        "content-type": "application/json",
        connection: "close",
      });
      response.end(JSON.stringify({
        object: "list",
        data: [
          { id: "starter", object: "model" },
          { id: "balanced", object: "model" },
          { id: "quality", object: "model" },
        ],
      }));
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/responses") {
      response.writeHead(200, {
        "content-type": "application/json",
        connection: "close",
      });
      response.end(JSON.stringify({
        id: "resp_smoke",
        object: "response",
        output_text: "BENCHMARK_READY",
        output: [],
      }));
      return;
    }

    if (request.method === "GET" && requestUrl.pathname.startsWith("/models/")) {
      const filename = requestUrl.pathname.replace("/models/", "");
      const filePath = path.join(modelDir, filename);
      if (!fs.existsSync(filePath)) {
        response.writeHead(404);
        response.end();
        return;
      }
      response.writeHead(200, {
        "content-type": "application/octet-stream",
        "content-length": String((await fsp.stat(filePath)).size),
        connection: "close",
      });
      fs.createReadStream(filePath).pipe(response);
      return;
    }

    response.writeHead(404);
    response.end();
  });

  server.listen(resolvedPort, host);
  await once(server, "listening");

  return {
    baseUrl: `http://${host}:${resolvedPort}`,
    artifacts,
    host,
    modelDir,
    port: resolvedPort,
    rootDir: resolvedRootDir,
    server,
  };
}

SurfaceOps Desktop packages a `model-runtime` directory alongside the bundled workbench runtime.

`build:runtime` now resolves the Apple Silicon runtime from the pinned `llama.cpp` manifest in
`llama-runtime.manifest.json` and extracts the full runtime bundle into `.desktop-runtime/model-runtime`.

Use `SURFACEOPS_LLAMA_SERVER_BIN` only as a local packaging override when you need to inject a
different runtime during development. Packaged SurfaceOps builds should boot from the bundled
runtime payload, not from a runtime-specific environment override.

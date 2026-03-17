import test from "node:test";
import assert from "node:assert/strict";

import { createDefaultUpdateStatus } from "@surfaces/surfaceops-desktop-bridge";

import { buildSurfaceOpsMenuTemplate } from "../lib/menu-template.cjs";

test("surfaceops desktop menu keeps workbench and updates controls only", () => {
  const template = buildSurfaceOpsMenuTemplate({
    status: createDefaultUpdateStatus({ channel: "alpha" }),
    onOpenWorkbench: () => {},
    onCheckForUpdates: () => {},
    onSetUpdateChannel: () => {},
    onRestartToUpdate: () => {},
  });

  const fileMenu = template.find((item) => item.label === "File");
  assert.ok(fileMenu);
  assert.ok(fileMenu.submenu.some((item) => item.label === "Open Workbench"));
  assert.ok(!fileMenu.submenu.some((item) => item.label === "Open Desktop Settings"));

  const updatesMenu = template.find((item) => item.label === "Updates");
  assert.ok(updatesMenu);
  assert.ok(updatesMenu.submenu.some((item) => item.label === "Check for Updates"));
  assert.ok(updatesMenu.submenu.some((item) => item.label === "Restart to Update"));

  const channelMenu = updatesMenu.submenu.find((item) => item.label === "Channel");
  assert.ok(channelMenu);
  assert.deepEqual(
    channelMenu.submenu.map((item) => item.label),
    ["Alpha", "Stable"],
  );
});

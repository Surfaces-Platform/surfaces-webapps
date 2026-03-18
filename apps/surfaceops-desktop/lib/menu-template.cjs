function buildSurfaceOpsMenuTemplate({
  status,
  onOpenWorkbench,
  onCheckForUpdates,
  onSetUpdateChannel,
  onRestartToUpdate,
}) {
  return [
    { role: "appMenu" },
    {
      label: "File",
      submenu: [
        { label: "Open Workbench", click: onOpenWorkbench },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Updates",
      submenu: [
        {
          label: "Check for Updates",
          click: onCheckForUpdates,
        },
        {
          label: "Channel",
          submenu: [
            {
              label: "Alpha",
              type: "radio",
              checked: status.channel === "alpha",
              click: () => onSetUpdateChannel("alpha"),
            },
            {
              label: "Stable",
              type: "radio",
              checked: status.channel === "stable",
              click: () => onSetUpdateChannel("stable"),
            },
          ],
        },
        {
          label: "Restart to Update",
          enabled: status.updateDownloaded,
          click: onRestartToUpdate,
        },
        {
          label: status.updateDownloaded
            ? `Update ready: ${status.downloadedVersion ?? "new version"}`
            : status.phase === "checking"
              ? "Checking for updates..."
              : status.errorMessage
                ? `Update error: ${status.errorMessage}`
                : `Channel: ${status.channel}`,
          enabled: false,
        },
      ],
    },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];
}

module.exports = {
  buildSurfaceOpsMenuTemplate,
};

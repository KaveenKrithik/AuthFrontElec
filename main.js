const { app, BrowserWindow, ipcMain, protocol, net, systemPreferences } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

// Make app:// a secure origin (needed for WebAuthn on Windows Hello)
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    backgroundColor: "#0b0d13",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Serve local files from app://local/...
  protocol.handle("app", async (request) => {
    // request.url like: app://local/index.html
    const relativePath = request.url.replace("app://local/", "") || "index.html";
    const filePath = path.join(__dirname, relativePath);
    return net.fetch(pathToFileURL(filePath).toString());
  });

  win.loadURL("app://local/index.html");
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Touch ID (macOS only)
ipcMain.handle("bio:touchid", async (_event, reason) => {
  if (process.platform !== "darwin") return { ok: false, error: "NOT_MAC" };
  if (!systemPreferences.canPromptTouchID()) return { ok: false, error: "TOUCHID_UNAVAILABLE" };

  try {
    await systemPreferences.promptTouchID(reason || "Authenticate to sign in");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});
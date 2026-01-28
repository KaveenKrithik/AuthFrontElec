const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  touchIdPrompt: (reason) => ipcRenderer.invoke("bio:touchid", reason),
});
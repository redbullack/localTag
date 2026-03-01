"use strict";

// main/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  // IPC methods will go here
  hello: () => import_electron.ipcRenderer.invoke("hello")
});

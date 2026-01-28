const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Window controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),
    
    // Auth
    register: (email, password) => ipcRenderer.invoke('auth:register', { email, password }),
    login: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getUser: () => ipcRenderer.invoke('auth:get-user'),
    
    // Biometric
    enableBiometric: () => ipcRenderer.invoke('auth:enable-biometric'),
    authenticateBiometric: (email) => ipcRenderer.invoke('auth:biometric', { email }),
    checkBiometric: (email) => ipcRenderer.invoke('auth:check-biometric', { email }),
    
    // Platform
    platform: process.platform
});

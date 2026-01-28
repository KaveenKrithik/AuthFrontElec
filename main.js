const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
require('dotenv').config();

// Auth service
const authService = require('./src/auth');
const WindowsHello = require('./src/windows-hello');

let mainWindow;
let currentUser = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        frame: false,
        backgroundColor: '#0a0a0f',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow?.maximize();
    }
});
ipcMain.on('window-close', () => mainWindow?.close());

// Auth handlers
ipcMain.handle('auth:register', async (event, { email, password }) => {
    try {
        const result = await authService.register(email, password);
        if (result.success) {
            currentUser = result.user;
        }
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('auth:login', async (event, { email, password }) => {
    try {
        const result = await authService.login(email, password);
        if (result.success) {
            currentUser = result.user;
        }
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Enable biometric - triggers Windows Hello prompt for enrollment
ipcMain.handle('auth:enable-biometric', async () => {
    if (!currentUser) {
        return { success: false, error: 'Not logged in' };
    }

    try {
        // First verify via Windows Hello
        console.log('Requesting Windows Hello verification for enrollment...');
        const helloResult = await WindowsHello.requestVerification();
        
        if (!helloResult.success || !helloResult.verified) {
            return { success: false, error: 'Windows Hello verification failed' };
        }

        // Store in database
        const result = await authService.enableBiometric(currentUser.id, currentUser.email);
        return result;
    } catch (error) {
        console.error('Biometric enrollment error:', error);
        return { success: false, error: error.message };
    }
});

// Authenticate with biometric - triggers actual Windows Hello prompt
ipcMain.handle('auth:biometric', async (event, { email }) => {
    try {
        // First check if user has biometric enabled
        const user = await authService.getUserByEmail(email);
        if (!user || !user.biometric_enabled) {
            return { success: false, error: 'Biometric not enabled for this user' };
        }

        // Now trigger Windows Hello prompt
        console.log('Requesting Windows Hello verification for login...');
        const helloResult = await WindowsHello.requestVerification();
        
        if (!helloResult.success || !helloResult.verified) {
            return { success: false, error: helloResult.reason || 'Biometric verification failed' };
        }

        // Windows Hello verified successfully
        currentUser = { id: user.id, email: user.email };
        return { 
            success: true, 
            user: currentUser
        };
    } catch (error) {
        console.error('Biometric auth error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('auth:check-biometric', async (event, { email }) => {
    try {
        const user = await authService.getUserByEmail(email);
        return { available: user && user.biometric_enabled };
    } catch (error) {
        return { available: false };
    }
});

ipcMain.handle('auth:get-user', () => {
    return currentUser;
});

ipcMain.handle('auth:logout', () => {
    currentUser = null;
    return { success: true };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

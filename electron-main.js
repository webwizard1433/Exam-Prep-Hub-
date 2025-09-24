const { app, BrowserWindow } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// IMPORTANT: Replace this with your actual Render application URL
const RENDER_URL = 'https://exam-prep-hub.onrender.com';

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            // It's more secure to keep nodeIntegration off when loading remote content
            nodeIntegration: false,
            contextIsolation: true,
        },
        // Optional: Set an icon for your application window
        // icon: path.join(__dirname, 'build/icon.png') 
    });

    // Load the live application from Render
    mainWindow.loadURL(RENDER_URL);

    // Optional: Open the DevTools for debugging.
    // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow();

    // Check for updates and notify the user
    autoUpdater.checkForUpdatesAndNotify();

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
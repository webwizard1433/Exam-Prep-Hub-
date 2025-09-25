const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// --- Configure Logging ---
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// IMPORTANT: Replace this with your actual Render application URL
const RENDER_URL = 'https://exam-prep-hub.onrender.com/login.html';

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: 'Exam Prep Hub', // Set the initial window title
        webPreferences: {
            // It's more secure to keep nodeIntegration off when loading remote content
            nodeIntegration: false,
            contextIsolation: true,
        },
        // Optional: Set an icon for your application window
        // The icon is set by electron-builder, but this is good for development
        icon: path.join(__dirname, 'build/icon.ico') 
    });

    // Load the live application from Render
    mainWindow.loadURL(RENDER_URL);

    // Optional: Open the DevTools for debugging.
    // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
    createWindow();
    log.info('App starting...');

    // --- Auto-Updater Logic ---
    // We replace checkForUpdatesAndNotify() with a manual check to handle events.
    autoUpdater.checkForUpdates();

    autoUpdater.on('update-available', (info) => {
        log.info('Update available.', info);
    });

    autoUpdater.on('update-not-available', (info) => {
        log.info('Update not available.', info);
    });

    autoUpdater.on('error', (err) => {
        log.error('Error in auto-updater. ' + err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
        log.info(log_message);
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded.', info);
        // The update will be installed silently on the next app quit.
        // You can also prompt the user to restart.
        dialog.showMessageBox({
            title: 'Update Ready',
            message: 'A new version of Exam Prep Hub has been downloaded. It will be installed on the next restart.'
        });
    });

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
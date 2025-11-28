const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'icon.png'),
        backgroundColor: '#f9fafb',
        autoHideMenuBar: true,
        frame: true
    });

    mainWindow.loadFile('index.html');

    // Open DevTools in development
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC handlers for saving and loading data
ipcMain.on('save-data', (event, data) => {
    // In a production app, you'd save to a file or database
    console.log('Saving data:', data);
});

ipcMain.on('load-data', (event) => {
    // In a production app, you'd load from a file or database
    event.reply('data-loaded', {});
});

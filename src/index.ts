import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, ipcMain, BrowserView } from 'electron';
import path from 'path';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let appTray: Tray | null = null;
let isQuitting: boolean = false;

const createMainWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 900,
    width: 1200,
    show: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
  
  setAppMenu();
  createTrayWithPopup();
  handleWindowFocus();
  handleWindowBlur();
  handleWindowMinimize();
  setupIPC();
  
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
      return false;
    }
    return true;
  });
  
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });
};

const setAppMenu = (): void => {
  const menu = Menu.buildFromTemplate(getAppMenuTemplate());
  Menu.setApplicationMenu(menu);
};

const getAppMenuTemplate = (): Electron.MenuItemConstructorOptions[] => [
  {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      {
        label: 'Preferences',
        accelerator: 'CmdOrCtrl+,',
        click: openSettingsModal,
      },
      { type: 'separator' },
      { role: 'quit' },
    ],
  },
  {
    label: 'File',
    submenu: [
      {
        label: 'Preferences',
        accelerator: 'CmdOrCtrl+,',
        click: openSettingsModal,
      },
    ],
  },
];

const openSettingsModal = (): void => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('open-settings-modal');
  }
};

const handleWindowMinimize = (): void => {
  if (mainWindow) {
    mainWindow.on('minimize', () => {
      mainWindow?.hide();
    });
  }
};

const handleWindowFocus = (): void => {
  if (mainWindow) {
    mainWindow.on('focus', () => {
      globalShortcut.register('CommandOrControl+,', openSettingsModal);
    });
  }
};

const handleWindowBlur = (): void => {
  if (mainWindow) {
    mainWindow.on('blur', () => {
      globalShortcut.unregister('CommandOrControl+,');
    });
  }
};

const createTrayWithPopup = (): void => {
  const iconPath = path.join(__dirname, 'assets', './resources/icon/icon-small.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  appTray = new Tray(trayIcon);
  appTray.setToolTip(app.getName());
  
  trayWindow = new BrowserWindow({
    width: 550,
    height: 700,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    transparent: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  trayWindow.loadURL(`${MAIN_WINDOW_WEBPACK_ENTRY}?tray=true`);
  
  trayWindow.on('blur', () => {
    trayWindow?.hide();
  });
  
  trayWindow.setSkipTaskbar(true);
  
  appTray.on('click', (event, bounds) => {
    const { x, y } = bounds;
    
    const windowBounds = trayWindow?.getBounds();
    if (windowBounds) {
      if (process.platform === 'darwin') {
        trayWindow?.setPosition(
          Math.round(x - windowBounds.width / 2),
          Math.round(y + 1),
          false
        );
      } else {
        trayWindow?.setPosition(
          Math.round(x - windowBounds.width / 2),
          Math.round(y + bounds.height),
          false
        );
      }
    }
    
    if (trayWindow?.isVisible()) {
      trayWindow.hide();
    } else {
      trayWindow?.show();
      trayWindow?.focus();
    }
  });
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  
  appTray.on('right-click', () => {
    appTray?.popUpContextMenu(contextMenu);
  });
};

const setupIPC = (): void => {
  ipcMain.on('show-main-app', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  ipcMain.on('quit-app', () => {
    isQuitting = true;
    app.quit();
  });

  ipcMain.on('sync-state', (event, state) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    
    if (senderWindow === mainWindow && trayWindow) {
      trayWindow.webContents.send('sync-state-update', state);
    } else if (senderWindow === trayWindow && mainWindow) {
      mainWindow.webContents.send('sync-state-update', state);
    }
  });
  
  ipcMain.handle('is-tray-window', (event) => {
    const windowUrl = event.sender.getURL();
    return windowUrl.includes('tray=true');
  });
};

const initializeApp = (): void => {
  if (require('electron-squirrel-startup')) {
    app.quit();
    return;
  }
  
  app.on('ready', createMainWindow);
  
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  app.on('before-quit', () => {
    isQuitting = true;
  });
};

initializeApp();
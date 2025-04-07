import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, ipcMain, BrowserView } from 'electron';
import path from 'path';
import storageService from './storage-service';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let appTray: Tray | null = null;
let isQuitting: boolean = false;

let boardState: any = null;
const BOARD_STATE_KEY = 'boardState';

const createMainWindow = async (): Promise<void> => {
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
  
  await loadPersistedState();
  
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
    
    saveBoardState();
    return true;
  });
  
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.openDevTools()
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
    label: 'Edit',
    submenu: [
      { 
        label: 'Undo', 
        accelerator: 'CmdOrCtrl+Z', 
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('perform-undo');
          }
          if (trayWindow && trayWindow.isVisible()) {
            trayWindow.webContents.send('perform-undo');
          }
        }
      },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
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
      { type: 'separator' },
      {
        label: 'Export Data',
        click: exportData,
      },
      {
        label: 'Import Data',
        click: importData,
      },
      { type: 'separator' },
      {
        label: 'Enable iCloud Sync',
        type: 'checkbox',
        checked: storageService.isICloudEnabled(),
        enabled: storageService.isICloudAvailable(),
        click: (menuItem) => {
          const success = storageService.enableICloud(menuItem.checked);
          if (!success && menuItem.checked) {
            menuItem.checked = false;
            if (mainWindow) {
              mainWindow.webContents.send('show-message', {
                type: 'error',
                message: 'Failed to enable iCloud sync. Make sure iCloud Drive is enabled on your device.'
              });
            }
          } else if (success && menuItem.checked) {
            
            saveBoardState();
          }
        }
      }
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

const exportData = async (): Promise<void> => {
  if (!mainWindow) return;
  
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Data',
    defaultPath: path.join(app.getPath('documents'), 'board-data.json'),
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });
  
  if (result.canceled || !result.filePath) return;
  
  try {
    
    if (boardState) {
      const fs = require('fs');
      await fs.promises.writeFile(result.filePath, JSON.stringify(boardState, null, 2), 'utf8');
      
      mainWindow.webContents.send('show-message', {
        type: 'success',
        message: 'Data exported successfully'
      });
    }
  } catch (error) {
    console.error('Failed to export data:', error);
    mainWindow.webContents.send('show-message', {
      type: 'error',
      message: 'Failed to export data'
    });
  }
};

const importData = async (): Promise<void> => {
  if (!mainWindow) return;
  
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Data',
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });
  
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) return;
  
  try {
    const fs = require('fs');
    const data = await fs.promises.readFile(result.filePaths[0], 'utf8');
    const parsedData = JSON.parse(data);
    
    
    if (parsedData && parsedData.boardData) {
      boardState = parsedData;
      
      
      if (mainWindow) {
        mainWindow.webContents.send('sync-state-update', boardState);
      }
      if (trayWindow) {
        trayWindow.webContents.send('sync-state-update', boardState);
      }
      
      
      await saveBoardState();
      
      mainWindow.webContents.send('show-message', {
        type: 'success',
        message: 'Data imported successfully'
      });
    } else {
      mainWindow.webContents.send('show-message', {
        type: 'error',
        message: 'Invalid data format'
      });
    }
  } catch (error) {
    console.error('Failed to import data:', error);
    mainWindow.webContents.send('show-message', {
      type: 'error',
      message: 'Failed to import data'
    });
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
      globalShortcut.register('CommandOrControl+Z', () => {
        mainWindow?.webContents.send('perform-undo');
      });
    });
  }
};

const handleWindowBlur = (): void => {
  if (mainWindow) {
    mainWindow.on('blur', () => {
      globalShortcut.unregister('CommandOrControl+,');
      globalShortcut.unregister('CommandOrControl+Z');
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
    
    
    boardState = state;
    
    if (senderWindow === mainWindow && trayWindow) {
      trayWindow.webContents.send('sync-state-update', state);
    } else if (senderWindow === trayWindow && mainWindow) {
      mainWindow.webContents.send('sync-state-update', state);
    }
    
    
    debouncedSaveBoardState();
  });
  
  ipcMain.handle('is-tray-window', (event) => {
    const windowUrl = event.sender.getURL();
    return windowUrl.includes('tray=true');
  });
  
  
  ipcMain.handle('get-board-state', async () => {
    console.log('Renderer requested board state:', boardState);
    return boardState;
  });
  
  ipcMain.on('save-board-state', async (event, state) => {
    boardState = state;
    await saveBoardState();
  });
  
  ipcMain.handle('is-icloud-available', () => {
    return storageService.isICloudAvailable();
  });
  
  ipcMain.handle('is-icloud-enabled', () => {
    return storageService.isICloudEnabled();
  });
  
  ipcMain.handle('toggle-icloud', async (event, enable) => {
    return storageService.enableICloud(enable);
  });

  ipcMain.handle('upload-image', async (event, imageData) => {
    try {
      // For this implementation, we're storing images directly in the data
      // If you want to save images to disk instead, you could do that here
      // and return a file path reference
      
      // Just return the image data as is for now
      return { success: true, imageData };
    } catch (error) {
      console.error('Failed to process image:', error);
      return { success: false, error: 'Failed to process image' };
    }
  });
};


let saveTimeout: NodeJS.Timeout | null = null;
const debouncedSaveBoardState = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    saveBoardState();
    saveTimeout = null;
  }, 1000); 
};

const saveBoardState = async (): Promise<void> => {
  if (boardState) {
    try {
      await storageService.saveData(BOARD_STATE_KEY, boardState);
      console.log('Board state saved successfully');
    } catch (error) {
      console.error('Failed to save board state:', error);
    }
  }
};

const loadPersistedState = async (): Promise<void> => {
  try {
    console.log(`Attempting to load state from ${BOARD_STATE_KEY}`);
    const savedState = await storageService.loadData(BOARD_STATE_KEY);
    if (savedState) {
      boardState = savedState;
      console.log('Loaded persisted board state:', boardState);
    } else {
      console.log('No persisted state found');
    }
  } catch (error) {
    console.error('Failed to load persisted state:', error);
  }
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
  
  app.on('before-quit', async () => {
    isQuitting = true;
    
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    
    await saveBoardState();
  });
};

initializeApp();
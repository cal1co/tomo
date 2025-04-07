import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  version: process.versions.electron,
  send: (channel: string, data: any) => {
    const validChannels = ['show-main-app', 'quit-app', 'get-menu-items', 'sync-state', 'save-board-state', 'upload-image'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel: string, callback: (data: any) => void) => {
    const validChannels = ['update-menu-items', 'update-submenu', 'sync-state-update', 'perform-undo', 'show-message', 'image-uploaded'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, data) => callback(data));
    }
  },
  removeListener: (channel: string) => {
    const validChannels = ['update-menu-items', 'update-submenu', 'sync-state-update', 'perform-undo', 'show-message', 'image-uploaded'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on("open-settings-modal", callback);
  },
  isTrayWindow: () => {
    return ipcRenderer.invoke('is-tray-window');
  },
  getBoardState: () => {
    return ipcRenderer.invoke('get-board-state');
  },
  isICloudAvailable: () => {
    return ipcRenderer.invoke('is-icloud-available');
  },
  isICloudEnabled: () => {
    return ipcRenderer.invoke('is-icloud-enabled');
  },
  toggleICloud: (enable: boolean) => {
    return ipcRenderer.invoke('toggle-icloud', enable);
  },
  uploadImage: (imageData: string) => {
    return ipcRenderer.invoke('upload-image', imageData);
  }
})
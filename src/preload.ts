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
        const validChannels = [
            'update-menu-items',
            'update-submenu',
            'sync-state-update',
            'perform-undo',
            'show-message',
            'image-uploaded',
            'show-create-ticket'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (_, data) => callback(data));
        }
    },

    removeListener: (channel: string) => {
        const validChannels = [
            'update-menu-items',
            'update-submenu',
            'sync-state-update',
            'perform-undo',
            'show-message',
            'image-uploaded',
            'show-create-ticket'
        ];
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
    },
    getTagsData: () => {
        return ipcRenderer.invoke('get-tags-data');
    },
    saveTagsData: (tags: any) => {
        return ipcRenderer.invoke('save-tags-data', tags);
    },
    getGroupsData: () => {
        return ipcRenderer.invoke('get-groups-data');
    },
    saveGroupsData: (groups: any) => {
        return ipcRenderer.invoke('save-groups-data', groups);
    },
    getNextTicketNumber: (groupId: string) => {
        return ipcRenderer.invoke('get-next-ticket-number', groupId);
    },
    incrementTicketNumber: (groupId: string) => {
        return ipcRenderer.invoke('increment-ticket-number', groupId);
    },
    updateTagOnTickets: (updatedTag: any) => {
        return ipcRenderer.invoke('update-tag-on-tickets', updatedTag);
    },
    updateGroupOnTickets: (groupId: string, oldName: string, newName: string) => {
        return ipcRenderer.invoke('update-group-on-tickets', groupId, oldName, newName);
    },
    getKeyboardShortcuts: () => {
        return ipcRenderer.invoke('get-keyboard-shortcuts');
    },
    saveKeyboardShortcuts: (shortcuts: any[]) => {
        return ipcRenderer.invoke('save-keyboard-shortcuts', shortcuts);
    }
});
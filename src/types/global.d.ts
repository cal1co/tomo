interface Window {
    electron?: {
        version: string;
        send: (channel: string, data: any) => void;
        receive: (channel: string, callback: (data: any) => void) => void;
        removeListener: (channel: string) => void;
        onOpenSettings: (callback: () => void) => void;
        isTrayWindow: () => Promise<boolean>;
        getBoardState: () => Promise<any>;
        isICloudAvailable: () => Promise<boolean>;
        isICloudEnabled: () => Promise<boolean>;
        toggleICloud: (enable: boolean) => Promise<boolean>;
        uploadImage: (imageData: string) => Promise<any>;
        getTagsData: () => Promise<any[]>;
        saveTagsData: (tags: any[]) => Promise<boolean>;
        getGroupsData: () => Promise<any[]>;
        saveGroupsData: (groups: any[]) => Promise<boolean>;
        getNextTicketNumber: (groupId: string) => Promise<number>;
        incrementTicketNumber: (groupId: string) => Promise<boolean>;
        updateTagOnTickets: (updatedTag: any) => Promise<boolean>;
        updateGroupOnTickets: (groupId: string, oldName: string, newName: string) => Promise<boolean>;
    };
}
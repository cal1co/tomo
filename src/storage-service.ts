import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * Storage service to handle state persistence to disk and cloud
 */
class StorageService {
    private storagePath: string;
    private useICloud = false;
    private iCloudPath: string | null = null;

    constructor() {
        this.storagePath = path.join(app.getPath('userData'), 'state');

        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, {recursive: true});
        }

        if (process.platform === 'darwin') {
            const homeDir = app.getPath('home');
            this.iCloudPath = path.join(homeDir, 'Library', 'Mobile Documents', 'com~apple~CloudDocs', 'YourAppName');
        }
    }

    /**
     * Enable or disable iCloud storage
     * @param enable Whether to enable iCloud storage
     * @returns true if successfully enabled, false otherwise
     */
    public enableICloud(enable: boolean): boolean {
        if (enable && !this.iCloudPath) {
            return false;
        }

        if (enable && this.iCloudPath) {
            try {
                if (!fs.existsSync(this.iCloudPath)) {
                    fs.mkdirSync(this.iCloudPath, {recursive: true});
                }
                this.useICloud = true;
                return true;
            } catch (error) {
                console.error('Failed to access iCloud directory:', error);
                this.useICloud = false;
                return false;
            }
        }

        this.useICloud = enable;
        return true;
    }

    /**
     * Save data to storage
     * @param key The key to store the data under
     * @param data The data to store
     * @returns Promise that resolves when the data is saved
     */
    public async saveData(key: string, data: any): Promise<void> {
        try {
            const jsonData = JSON.stringify(data, null, 2);

            const localFilePath = path.join(this.storagePath, `${ key }.json`);
            await fs.promises.writeFile(localFilePath, jsonData, 'utf8');

            if (this.useICloud && this.iCloudPath) {
                const iCloudFilePath = path.join(this.iCloudPath, `${ key }.json`);
                await fs.promises.writeFile(iCloudFilePath, jsonData, 'utf8');
            }
        } catch (error) {
            console.error(`Error saving data for key ${ key }:`, error);
            throw error;
        }
    }

    /**
     * Load data from storage
     * @param key The key to load data from
     * @returns Promise that resolves with the loaded data, or null if not found
     */
    public async loadData<T>(key: string): Promise<T | null> {
        try {
            if (this.useICloud && this.iCloudPath) {
                const iCloudFilePath = path.join(this.iCloudPath, `${ key }.json`);
                if (fs.existsSync(iCloudFilePath)) {
                    const data = await fs.promises.readFile(iCloudFilePath, 'utf8');
                    return JSON.parse(data) as T;
                }
            }

            const localFilePath = path.join(this.storagePath, `${ key }.json`);
            if (fs.existsSync(localFilePath)) {
                const data = await fs.promises.readFile(localFilePath, 'utf8');
                return JSON.parse(data) as T;
            }

            return null;
        } catch (error) {
            console.error(`Error loading data for key ${ key }:`, error);
            return null;
        }
    }

    /**
     * Check if data exists for a key
     * @param key The key to check
     * @returns Promise that resolves with true if data exists, false otherwise
     */
    public async hasData(key: string): Promise<boolean> {
        if (this.useICloud && this.iCloudPath) {
            const iCloudFilePath = path.join(this.iCloudPath, `${ key }.json`);
            if (fs.existsSync(iCloudFilePath)) {
                return true;
            }
        }

        const localFilePath = path.join(this.storagePath, `${ key }.json`);
        return fs.existsSync(localFilePath);
    }

    /**
     * Delete data for a key
     * @param key The key to delete data for
     * @returns Promise that resolves when the data is deleted
     */
    public async deleteData(key: string): Promise<void> {
        try {
            if (this.useICloud && this.iCloudPath) {
                const iCloudFilePath = path.join(this.iCloudPath, `${ key }.json`);
                if (fs.existsSync(iCloudFilePath)) {
                    await fs.promises.unlink(iCloudFilePath);
                }
            }

            const localFilePath = path.join(this.storagePath, `${ key }.json`);
            if (fs.existsSync(localFilePath)) {
                await fs.promises.unlink(localFilePath);
            }
        } catch (error) {
            console.error(`Error deleting data for key ${ key }:`, error);
            throw error;
        }
    }

    /**
     * List all available data keys
     * @returns Promise that resolves with an array of keys
     */
    public async listDataKeys(): Promise<string[]> {
        try {
            const keys = new Set<string>();

            const localFiles = await fs.promises.readdir(this.storagePath);
            for (const file of localFiles) {
                if (file.endsWith('.json')) {
                    keys.add(file.replace('.json', ''));
                }
            }

            if (this.useICloud && this.iCloudPath) {
                if (fs.existsSync(this.iCloudPath)) {
                    const iCloudFiles = await fs.promises.readdir(this.iCloudPath);
                    for (const file of iCloudFiles) {
                        if (file.endsWith('.json')) {
                            keys.add(file.replace('.json', ''));
                        }
                    }
                }
            }

            return Array.from(keys);
        } catch (error) {
            console.error('Error listing data keys:', error);
            return [];
        }
    }

    /**
     * Check if iCloud is available
     * @returns true if iCloud is available, false otherwise
     */
    public isICloudAvailable(): boolean {
        return this.iCloudPath !== null;
    }

    /**
     * Check if iCloud is enabled
     * @returns true if iCloud is enabled, false otherwise
     */
    public isICloudEnabled(): boolean {
        return this.useICloud;
    }

    /**
     * Save tag data
     * @param tags Array of tag objects
     * @returns Promise that resolves when tags are saved
     */
    public async saveTags(tags: any[]): Promise<void> {
        return this.saveData('tags', tags);
    }

    /**
     * Load tag data
     * @returns Promise that resolves with the tag data, or empty array if not found
     */
    public async loadTags<T>(): Promise<T[]> {
        const tags = await this.loadData<T[]>('tags');
        return tags || [];
    }

    /**
     * Save group data
     * @param groups Array of group objects
     * @returns Promise that resolves when groups are saved
     */
    public async saveGroups(groups: any[]): Promise<void> {
        return this.saveData('groups', groups);
    }

    /**
     * Load group data
     * @returns Promise that resolves with the group data, or empty array if not found
     */
    public async loadGroups<T>(): Promise<T[]> {
        const groups = await this.loadData<T[]>('groups');
        return groups || [];
    }

    /**
     * Get the next ticket number for a group and increment it
     * @param groupId The ID of the group
     * @returns Promise that resolves with the next ticket number
     */
    public async getAndIncrementTicketNumber(groupId: string): Promise<number> {
        const groups = await this.loadGroups<any>();
        const group = groups.find(g => g.id === groupId);

        if (!group) {
            return 1;
        }

        const nextNumber = group.nextTicketNumber || 1;

        group.nextTicketNumber = nextNumber + 1;
        await this.saveGroups(groups);

        return nextNumber;
    }
}

export default new StorageService();
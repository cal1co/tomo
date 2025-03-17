export {};

declare global {
  interface Window {
    electron: {
      version: string;
      send: (channel: string, data: any) => void;
      receive: (channel: string, callback: (data: any) => void) => void;
      removeListener: (channel: string) => void;
      onOpenSettings: (callback: () => void) => void;
      isTrayWindow: () => Promise<boolean>;
    };
  }
}
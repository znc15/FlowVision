export {};

declare global {
  interface Window {
    electron?: {
      platform: string;
      isElectron: boolean;
      appVersion: string;
      window?: {
        minimize: () => Promise<void>;
        toggleMaximize: () => Promise<boolean>;
        close: () => Promise<void>;
        isMaximized: () => Promise<boolean>;
        onMaximizedChanged: (callback: (value: boolean) => void) => () => void;
      };
      desktop?: {
        getSettings: () => Promise<{ closeAction: 'ask' | 'tray' | 'quit'; backendHost: string }>;
        getRuntimePaths: () => Promise<{ userData: string; sessionData: string; downloads: string }>;
        capturePage: (options: { x: number; y: number; width: number; height: number; filename?: string }) => Promise<{ path: string; width: number; height: number; size: number }>;
        setCloseAction: (action: 'ask' | 'tray' | 'quit') => Promise<{ closeAction: 'ask' | 'tray' | 'quit'; backendHost: string }>;
        setBackendHost: (host: '127.0.0.1' | '0.0.0.0') => Promise<{ closeAction: 'ask' | 'tray' | 'quit'; backendHost: string }>;
        onCloseActionChanged: (callback: (action: 'ask' | 'tray' | 'quit') => void) => () => void;
        onCloseRequested: (callback: () => void) => () => void;
        respondClose: (response: { action: 'tray' | 'quit' | 'cancel'; remember: boolean }) => Promise<void>;
      };
    };
  }
}

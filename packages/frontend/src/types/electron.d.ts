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
        getSettings: () => Promise<{ closeAction: 'ask' | 'minimize' | 'quit'; backendHost: string }>;
        setCloseAction: (action: 'ask' | 'minimize' | 'quit') => Promise<{ closeAction: 'ask' | 'minimize' | 'quit'; backendHost: string }>;
        setBackendHost: (host: '127.0.0.1' | '0.0.0.0') => Promise<{ closeAction: 'ask' | 'minimize' | 'quit'; backendHost: string }>;
      };
    };
  }
}

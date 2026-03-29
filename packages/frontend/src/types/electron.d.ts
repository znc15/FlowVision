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
        getSettings: () => Promise<{ closeToTray: boolean }>;
        setCloseToTray: (enabled: boolean) => Promise<{ closeToTray: boolean }>;
      };
    };
  }
}

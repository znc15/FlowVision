export interface AppConfig {
  name: string;
  version: string;
  debug: boolean;
}

export const defaultConfig: AppConfig = {
  name: 'simple-project',
  version: '1.0.0',
  debug: false,
};

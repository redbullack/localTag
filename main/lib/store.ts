import Store from 'electron-store';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings {
    theme: ThemeMode;
    autoStart: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
    theme: 'system',
    autoStart: false,
};

interface ConfigType {
    vaultPath: string | null;
    settings: AppSettings;
}

const store = new Store<ConfigType>({
    defaults: {
        vaultPath: null,
        settings: DEFAULT_SETTINGS,
    },
});

export const getVaultPath = (): string | null => {
    return store.get('vaultPath');
};

export const setVaultPath = (vaultPath: string): void => {
    store.set('vaultPath', vaultPath);
};

export const getSettings = (): AppSettings => {
    return { ...DEFAULT_SETTINGS, ...store.get('settings') };
};

export const getSetting = <K extends keyof AppSettings>(key: K): AppSettings[K] => {
    return store.get('settings')[key];
};

export const setSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]): void => {
    const settings = store.get('settings');
    settings[key] = value;
    store.set('settings', settings);
};

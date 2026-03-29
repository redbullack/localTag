import Store from 'electron-store';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AutoCollectSettings {
    enabled: boolean;
    watchPaths: string[];
    defaultTagIds: number[];
    stabilityDelayMs: number;
}

export interface AppSettings {
    theme: ThemeMode;
    autoStart: boolean;
    autoCollect: AutoCollectSettings;
    hasSeenOnboarding: boolean;
}

const DEFAULT_AUTO_COLLECT: AutoCollectSettings = {
    enabled: false,
    watchPaths: [],
    defaultTagIds: [],
    stabilityDelayMs: 3000,
};

const DEFAULT_SETTINGS: AppSettings = {
    theme: 'system',
    autoStart: false,
    autoCollect: DEFAULT_AUTO_COLLECT,
    hasSeenOnboarding: false,
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

export const getAutoCollectSettings = (): AutoCollectSettings => {
    const settings = getSettings();
    return { ...DEFAULT_AUTO_COLLECT, ...settings.autoCollect };
};

export const setAutoCollectSettings = (autoCollect: Partial<AutoCollectSettings>): AutoCollectSettings => {
    const current = getAutoCollectSettings();
    const updated = { ...current, ...autoCollect };
    setSetting('autoCollect', updated);
    return updated;
};

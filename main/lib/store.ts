import Store from 'electron-store';

type ThemeMode = 'light' | 'dark' | 'system';

interface ConfigType {
    vaultPath: string | null;
    theme: ThemeMode;
}

const store = new Store<ConfigType>({
    defaults: {
        vaultPath: null,
        theme: 'system',
    },
});

export const getVaultPath = (): string | null => {
    return store.get('vaultPath');
};

export const setVaultPath = (vaultPath: string): void => {
    store.set('vaultPath', vaultPath);
};

export const getTheme = (): ThemeMode => {
    return store.get('theme');
};

export const setTheme = (theme: ThemeMode): void => {
    store.set('theme', theme);
};

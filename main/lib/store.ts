import Store from 'electron-store';

interface ConfigType {
    vaultPath: string | null;
}

const store = new Store<ConfigType>({
    defaults: {
        vaultPath: null,
    },
});

export const getVaultPath = (): string | null => {
    return store.get('vaultPath');
};

export const setVaultPath = (vaultPath: string): void => {
    store.set('vaultPath', vaultPath);
};

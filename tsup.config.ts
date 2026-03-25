import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['main/main.ts', 'main/preload.ts'],
    outDir: 'dist-main',
    clean: true,
    format: ['cjs'],
    external: ['electron', 'better-sqlite3', 'electron-updater'],
    target: 'node16',
});

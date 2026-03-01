'use client';

import { useEffect, useState } from 'react';

export default function Home() {
    const [vaultPath, setVaultPath] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkVaultPath = async () => {
            if (typeof window !== 'undefined' && window.electronAPI) {
                const path = await window.electronAPI.getVaultPath();
                setVaultPath(path);
            }
            setIsLoading(false);
        };
        checkVaultPath();
    }, []);

    const handleSelectVault = async () => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            const selectedPath = await window.electronAPI.selectVaultPath();
            if (selectedPath) {
                setVaultPath(selectedPath);
            }
        }
    };

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
                <p>Loading...</p>
            </main>
        );
    }

    if (!vaultPath) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
                <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-4">
                        Welcome to LocalTag
                    </h1>
                    <p className="text-gray-300 mb-8">
                        파일을 관리할 위치를 선택해 주세요.<br />
                        선택한 위치에 <code className="text-purple-400">MyTaggedFiles</code> 폴더가 자동으로 생성됩니다.
                    </p>
                    <button
                        onClick={handleSelectVault}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 transition-colors rounded-xl font-semibold text-white shadow-lg shadow-purple-500/30"
                    >
                        저장 위치 선택
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 text-center bg-gray-900 text-white">
            <h1 className="mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-5xl font-bold text-transparent">
                LocalTag
            </h1>
            <div className="mt-8 p-6 bg-gray-800 rounded-2xl shadow-lg border border-gray-700">
                <p className="text-lg text-gray-300 mb-2">Vault Location:</p>
                <code className="px-4 py-2 bg-gray-900 rounded-lg text-green-400 break-all">
                    {vaultPath}
                </code>
            </div>
        </main>
    );
}

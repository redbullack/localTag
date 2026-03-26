'use client';

import { useCallback, useEffect, useState } from 'react';
import FileList from './components/file-list/file-list';
import FileTagEditor from './components/file-tag-editor/file-tag-editor';
import { useConfirm } from './components/shared/confirm-dialog';
import { useLoadingOverlay } from './components/shared/loading-overlay';
import { useToast } from './components/shared/toast-provider';
import TagFormModal from './components/tag-form-modal/tag-form-modal';
import AutoStartToggle from './components/shared/auto-start-toggle';
import ThemeToggle from './components/shared/theme-toggle';
import AutoCollectSettingsModal from './components/auto-collect-settings/auto-collect-settings';
import './components/auto-collect-settings/auto-collect-settings.css';
import TagSidebar from './components/tag-sidebar/tag-sidebar';
import VaultInfo from './components/vault-info/vault-info';
import type { FileWithTags, SortOption, Tag } from './types';
import { reorderTagListLocally } from './utils/tag-tree';
import { UNTAGGED_TAG_ID } from './constants';
import { useDebounce } from './utils/use-debounce';
import { useAutoUpdate } from './utils/use-auto-update';
import { handleAddFilesResponse, handleFileTransferResponse } from './utils/file-transfer';
import UpdateBanner from './components/shared/update-banner';
import './components/shared/tag-badge.css';

export default function Home() {
    const [vaultPath, setVaultPath] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRelocating, setIsRelocating] = useState(false);
    const { showToast } = useToast();
    const { showConfirm } = useConfirm();
    const { showLoading, updateProgress, hideLoading } = useLoadingOverlay();

    // 태그 상태
    const [tagList, setTagList] = useState<Tag[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [defaultParentId, setDefaultParentId] = useState<number | null>(null);

    // 자동 수집 상태
    const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
    const [isCollectEnabled, setIsCollectEnabled] = useState(false);

    // 파일 상태
    const [fileList, setFileList] = useState<FileWithTags[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());

    // 검색 상태
    const [searchKeyword, setSearchKeyword] = useState('');
    const debouncedSearchKeyword = useDebounce(searchKeyword, 300);

    // 페이징/정렬 상태
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [overallFileCount, setOverallFileCount] = useState(0);
    const [untaggedFileCount, setUntaggedFileCount] = useState(0);
    const [sortOption, setSortOption] = useState<SortOption>({ column: 'updatedAt', order: 'desc' });

    // 파일 태그 에디터 상태
    const [tagEditorFiles, setTagEditorFiles] = useState<FileWithTags[] | null>(null);

    // 자동 업데이트 상태
    const updateState = useAutoUpdate();

    // VaultInfo 용량 정보 갱신 트리거
    const [storageRefreshTrigger, setStorageRefreshTrigger] = useState(0);
    const triggerStorageRefresh = useCallback(() => setStorageRefreshTrigger((c) => c + 1), []);

    /** 최초 진입 시 Vault 경로를 확인한다. */
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

    /** 사이드바 태그 목록을 새로 불러온다. */
    const loadTags = useCallback(async () => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const response = await window.electronAPI.getAllTags();
        if (response.success && response.data) {
            setTagList(response.data);
        }
    }, []);

    /** 현재 필터/페이지/정렬 조건에 맞는 파일 목록을 불러온다. */
    const loadFiles = useCallback(async () => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const includeUntagged = selectedTagIds.includes(UNTAGGED_TAG_ID);
        const realTagIds = selectedTagIds.filter((id) => id !== UNTAGGED_TAG_ID);
        const keyword = debouncedSearchKeyword || undefined;

        let response;
        if (includeUntagged && realTagIds.length === 0) {
            // "태그 없음"만 단독 선택
            response = await window.electronAPI.getUntaggedFiles({
                page: currentPage,
                limit: 50,
                sort: sortOption,
                searchKeyword: keyword,
            });
        } else if (realTagIds.length > 0) {
            // 일반 태그 선택 (+ 태그 없음 포함 가능)
            response = await window.electronAPI.getFilesByTags({
                tagIds: realTagIds,
                page: currentPage,
                limit: 50,
                sort: sortOption,
                includeUntagged,
                searchKeyword: keyword,
            });
        } else {
            // 필터 없음 → 전체
            response = await window.electronAPI.getAllFiles({
                page: currentPage,
                limit: 50,
                sort: sortOption,
                searchKeyword: keyword,
            });
        }

        if (response.success && response.data) {
            setFileList(response.data);
            if (response.totalCount !== undefined) {
                setTotalCount(response.totalCount);
            }
        }

        const [countResponse, untaggedCountResponse] = await Promise.all([
            window.electronAPI.getTotalFileCount(),
            window.electronAPI.getUntaggedFileCount(),
        ]);
        if (countResponse.success && countResponse.data !== undefined) {
            setOverallFileCount(countResponse.data);
        }
        if (untaggedCountResponse.success && untaggedCountResponse.data !== undefined) {
            setUntaggedFileCount(untaggedCountResponse.data);
        }

        triggerStorageRefresh();
    }, [currentPage, debouncedSearchKeyword, selectedTagIds, sortOption, triggerStorageRefresh]);

    /** Vault가 준비되면 태그와 파일을 함께 로드한다. */
    useEffect(() => {
        if (!vaultPath) return;

        loadTags();
        loadFiles();
    }, [loadFiles, loadTags, vaultPath]);

    /** 파일 목록이 갱신되면 현재 선택된 파일도 초기화한다. */
    useEffect(() => {
        setSelectedFileIds(new Set());
    }, [fileList]);

    /** 검색어가 변경되면 첫 페이지로 리셋한다. */
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchKeyword]);

    // ── Vault 동기화 (Sync) ──

    /** 원본 폴더와 DB를 비교해 변경 사항을 동기화한다. */
    const handleSync = useCallback(async (isSilent = false) => {
        if (typeof window === 'undefined' || !window.electronAPI || !vaultPath || isSyncing) return;

        setIsSyncing(true);
        if (!isSilent) {
            showLoading({ operationType: 'sync', description: '동기화 중...' });
        }
        try {
            const response = await window.electronAPI.syncFiles({ silent: isSilent });

            if (response.success && response.data) {
                const { addedCount, deletedCount, updatedCount, detectedFolderCount } = response.data;
                const totalChanges = addedCount + deletedCount + updatedCount;

                if (totalChanges > 0) {
                    await loadTags();
                    await loadFiles();

                    const messageParts = [];
                    if (addedCount > 0) messageParts.push(`${addedCount}개 추가`);
                    if (deletedCount > 0) messageParts.push(`${deletedCount}개 삭제`);
                    if (updatedCount > 0) messageParts.push(`${updatedCount}개 갱신`);

                    showToast({
                        type: 'success',
                        message: `동기화 완료: ${messageParts.join(', ')}`,
                        duration: 4000,
                    });
                } else if (!isSilent) {
                    showToast({
                        type: 'info',
                        message: '모든 파일이 최신 상태입니다.',
                        duration: 3000,
                    });
                }

                if (detectedFolderCount > 0) {
                    showToast({
                        type: 'warning',
                        message: `Vault 내 ${detectedFolderCount}개의 폴더가 감지되었습니다. Vault는 파일만 관리합니다.`,
                        duration: 5000,
                    });
                }
            } else if (!isSilent) {
                showToast({
                    type: 'error',
                    message: response.error || '동기화 중 오류가 발생했습니다.',
                    duration: 4000,
                });
            }
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            setIsSyncing(false);
            hideLoading();
        }
    }, [hideLoading, isSyncing, loadFiles, loadTags, showLoading, showToast, vaultPath]);

    /** Main → Renderer 파일 작업 진행률 이벤트를 구독한다. */
    useEffect(() => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const cleanup = window.electronAPI.onFileOperationProgress((progress) => {
            updateProgress({
                currentFile: progress.currentFile,
                currentIndex: progress.currentIndex,
                totalCount: progress.totalCount,
                bytesTransferred: progress.bytesTransferred,
                totalBytes: progress.totalBytes,
            });
        });

        return cleanup;
    }, [updateProgress]);

    /** 자동 수집 이벤트를 구독한다. */
    useEffect(() => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const cleanup = window.electronAPI.onFileCollected((event) => {
            if (event.error) {
                showToast({ type: 'error', message: `수집 실패: ${event.filename} — ${event.error}`, duration: 4000 });
                return;
            }
            if (event.skipped) return;

            const tagInfo = event.tagNames.length > 0 ? ` [${event.tagNames.join(', ')}]` : '';
            showToast({
                type: 'success',
                message: `자동 수집: ${event.filename}${tagInfo}`,
                duration: 3000,
            });
            loadFiles();
            loadTags();
        });

        return cleanup;
    }, [loadFiles, loadTags, showToast]);

    /** 자동 수집 설정 상태를 로드한다. */
    useEffect(() => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        window.electronAPI.getAutoCollectSettings().then((response) => {
            if (response.success && response.data) {
                setIsCollectEnabled(response.data.enabled);
            }
        });
    }, []);

    /** 앱이 다시 포커스를 얻으면 조용히 동기화한다. (파일 작업 중이면 스킵) */
    useEffect(() => {
        const handleFocus = async () => {
            if (!vaultPath || isSyncing) return;

            if (typeof window !== 'undefined' && window.electronAPI) {
                const response = await window.electronAPI.isFileOperating();
                if (response.success && response.data) return;
            }

            handleSync(true);
        };

        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [handleSync, isSyncing, vaultPath]);

    // ── Vault 경로 설정 ──

    const handleSelectVault = async () => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const selectedPath = await window.electronAPI.selectVaultPath();
        if (selectedPath) {
            setVaultPath(selectedPath);
        }
    };

    // ── 태그 CRUD ──

    const handleOpenCreateModal = () => {
        setEditingTag(null);
        setDefaultParentId(null);
        setIsModalOpen(true);
    };

    const handleOpenCreateChildModal = (parentTag: Tag) => {
        setEditingTag(null);
        setDefaultParentId(parentTag.id);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (tag: Tag) => {
        setEditingTag(tag);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTag(null);
        setDefaultParentId(null);
    };

    /** 생성/수정 모달에서 받은 태그 값을 저장한다. */
    const handleSubmitTag = async (formData: { name: string; color: string; parentId: number | null }) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const response = editingTag
            ? await window.electronAPI.updateTag({
                id: editingTag.id,
                name: formData.name,
                color: formData.color,
                parentId: formData.parentId,
            })
            : await window.electronAPI.createTag({
                name: formData.name,
                color: formData.color,
                parentId: formData.parentId ?? undefined,
            });

        if (!response.success) {
            showToast({
                type: 'error',
                message: response.error || (editingTag ? '태그 수정에 실패했습니다.' : '태그 생성에 실패했습니다.'),
                duration: 4000,
            });
            return;
        }

        showToast({
            type: 'success',
            message: editingTag ? '1개의 태그가 수정되었습니다.' : '1개의 태그가 추가되었습니다.',
            duration: 3000,
        });

        handleCloseModal();
        await loadTags();
    };

    /** 태그 삭제 후 현재 필터와 목록을 함께 정리한다. */
    const handleDeleteTag = async (tagId: number) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const confirmed = await showConfirm({
            title: '태그 삭제',
            message: '이 태그를 삭제하시겠습니까?\n하위 태그도 함께 삭제됩니다.',
            confirmText: '삭제',
            danger: true,
        });
        if (!confirmed) return;

        const response = await window.electronAPI.deleteTag({ id: tagId });
        if (!response.success) {
            showToast({
                type: 'error',
                message: response.error || '태그 삭제에 실패했습니다.',
                duration: 4000,
            });
            return;
        }

        showToast({
            type: 'success',
            message: '1개의 태그가 삭제되었습니다.',
            duration: 3000,
        });

        if (selectedTagIds.includes(tagId)) {
            setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
        }

        await loadTags();
        await loadFiles();
    };

    /** 태그 즐겨찾기를 토글한다. */
    const handleToggleFavorite = async (tagId: number) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const tag = tagList.find((t) => t.id === tagId);
        if (!tag) return;

        const response = await window.electronAPI.updateTag({
            id: tagId,
            isFavorite: !tag.isFavorite,
        });

        if (!response.success) {
            showToast({
                type: 'error',
                message: response.error || '즐겨찾기 변경에 실패했습니다.',
                duration: 4000,
            });
            return;
        }

        showToast({
            type: 'success',
            message: tag.isFavorite ? '즐겨찾기에서 해제되었습니다.' : '즐겨찾기에 추가되었습니다.',
            duration: 3000,
        });

        await loadTags();
    };

    /** 사이드바 태그 선택을 토글하고, 필터 변경 시 첫 페이지로 이동한다. */
    const handleSelectTag = (tagId: number) => {
        setSelectedTagIds((prevIds) => (
            prevIds.includes(tagId)
                ? prevIds.filter((id) => id !== tagId)
                : [...prevIds, tagId]
        ));
        setCurrentPage(1);
    };

    /** 드래그로 태그 순서를 변경한다 (낙관적 업데이트). */
    const handleReorderTags = async (parentId: number | null, orderedIds: number[]) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const prevTagList = tagList;
        setTagList(reorderTagListLocally(tagList, parentId, orderedIds));

        const response = await window.electronAPI.reorderTags({ parentId, orderedIds });
        if (!response.success) {
            setTagList(prevTagList);
            showToast({
                type: 'error',
                message: response.error || '태그 순서 변경에 실패했습니다.',
                duration: 4000,
            });
        }
    };

    /** 현재 선택된 태그 이름을 파일 추가/헤더 표시에 사용한다. */
    const selectedTagNames = selectedTagIds.length > 0
        ? selectedTagIds
            .map((id) => id === UNTAGGED_TAG_ID ? '태그 없음' : tagList.find((tag) => tag.id === id)?.name)
            .filter(Boolean)
            .join(', ')
        : null;

    const getAddFilesConfirmMessage = (fileCount: number) => {
        const tagDescription = selectedTagNames ? `"${selectedTagNames}" 태그로` : '태그 없이';
        return `${fileCount}개의 파일을 ${tagDescription} 저장하시겠습니까?\n\n사이드바에서 선택한 태그가 새 파일의 기본값으로 적용됩니다.`;
    };

    // ── 파일 CRUD ──

    /** OS 파일 선택창을 통해 파일을 추가한다. */
    const handleAddFiles = async () => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const selectResponse = await window.electronAPI.selectFiles();
        if (!selectResponse.success || !selectResponse.data || selectResponse.data.filePaths.length === 0) {
            if (selectResponse.error) {
                showToast({ type: 'error', message: selectResponse.error, duration: 4000 });
            }
            return;
        }

        const filePaths = selectResponse.data.filePaths;
        const confirmed = await showConfirm({
            title: '파일 추가',
            message: getAddFilesConfirmMessage(filePaths.length),
        });
        if (!confirmed) return;

        showLoading({ operationType: 'add', description: '파일 추가 중...' });
        try {
            const addResponse = await window.electronAPI.addFiles({
                tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
                filePaths,
            });

            if (handleAddFilesResponse(addResponse, filePaths, showToast)) {
                await loadFiles();
            }
        } finally {
            hideLoading();
        }
    };

    /** 드래그 앤 드롭으로 전달된 파일 목록을 추가한다. */
    const handleDropFiles = async (filePaths: string[]) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const confirmed = await showConfirm({
            title: '파일 추가',
            message: getAddFilesConfirmMessage(filePaths.length),
        });
        if (!confirmed) return;

        showLoading({ operationType: 'add', description: '파일 추가 중...' });
        try {
            const response = await window.electronAPI.addFiles({
                tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
                filePaths,
            });

            if (handleAddFilesResponse(response, filePaths, showToast)) {
                await loadFiles();
            }
        } finally {
            hideLoading();
        }
    };

    /** 개별 파일 이름을 변경한다. */
    const handleRenameFile = async (fileId: number, newFilename: string) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const response = await window.electronAPI.renameFile({ id: fileId, newFilename });
        if (response.success) {
            showToast({
                type: 'success',
                message: '파일명이 수정되었습니다.',
                duration: 3000,
            });
            await loadFiles();
        } else {
            showToast({
                type: 'error',
                message: response.error || '파일명 수정에 실패했습니다.',
                duration: 4000,
            });
        }
    };

    /** 개별 파일을 삭제한다. */
    const handleDeleteFile = async (fileId: number, skipConfirmation: boolean = false) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        if (!skipConfirmation) {
            const confirmed = await showConfirm({
                title: '파일 삭제',
                message: '이 파일을 삭제하시겠습니까?\n파일시스템에서도 제거됩니다.',
                confirmText: '삭제',
                danger: true,
            });
            if (!confirmed) return;
        }

        const response = await window.electronAPI.deleteFile({ id: fileId });
        if (response.success) {
            showToast({
                type: 'success',
                message: '1개의 파일이 삭제되었습니다.',
                duration: 3000,
            });
            await loadFiles();
        } else {
            showToast({
                type: 'error',
                message: response.error || '파일 삭제에 실패했습니다.',
                duration: 4000,
            });
        }
    };

    /** 파일 리스트에서 선택 상태를 토글한다. */
    const handleToggleFileSelection = useCallback((fileId: number) => {
        setSelectedFileIds((prev) => {
            const next = new Set(prev);

            if (next.has(fileId)) {
                next.delete(fileId);
            } else {
                next.add(fileId);
            }

            return next;
        });
    }, []);

    /** 현재 페이지 파일 전체를 선택/해제한다. */
    const handleToggleAllFileSelection = useCallback(() => {
        if (fileList.length === 0) return;

        setSelectedFileIds((prev) => {
            if (prev.size === fileList.length) {
                return new Set();
            }

            return new Set(fileList.map((file) => file.id));
        });
    }, [fileList]);

    /** 선택된 파일을 한 번에 삭제한다. */
    const handleDeleteSelectedFiles = useCallback(async () => {
        if (typeof window === 'undefined' || !window.electronAPI || selectedFileIds.size === 0) return;

        const fileIds = Array.from(selectedFileIds);
        const confirmed = await showConfirm({
            title: '파일 삭제',
            message: `${fileIds.length}개의 파일을 삭제하시겠습니까?`,
            confirmText: '삭제',
            danger: true,
        });
        if (!confirmed) return;

        showLoading({ operationType: 'delete', description: '파일 삭제 중...' });
        try {
            const response = await window.electronAPI.deleteFilesBatch({ ids: fileIds });

            if (response.success && response.data) {
                showToast({
                    type: 'success',
                    message: `${response.data.deletedCount}개의 파일이 삭제되었습니다.`,
                    duration: 3000,
                });
            } else {
                showToast({
                    type: 'error',
                    message: response.error || '선택한 파일 삭제 중 오류가 발생했습니다.',
                    duration: 4000,
                });
            }

            setSelectedFileIds(new Set());
            await loadFiles();
        } finally {
            hideLoading();
        }
    }, [hideLoading, loadFiles, selectedFileIds, showConfirm, showLoading, showToast]);

    /** 개별 파일을 사용자 선택 폴더로 이동한다. */
    const handleMoveFile = async (file: FileWithTags) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const selectResponse = await window.electronAPI.selectFolder({ title: '파일을 이동할 폴더 선택' });
        if (!selectResponse.success || !selectResponse.data?.folderPath) return;

        showLoading({ operationType: 'move', description: '파일 이동 중...' });
        try {
            const response = await window.electronAPI.moveFilesToFolder({
                files: [{ id: file.id, filename: file.filename }],
                targetDir: selectResponse.data.folderPath,
            });

            if (handleFileTransferResponse(response, 'move', showToast)) {
                await loadFiles();
            }
        } finally {
            hideLoading();
        }
    };

    /** 개별 파일을 사용자 선택 폴더로 복사한다. */
    const handleCopyFile = async (file: FileWithTags) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const selectResponse = await window.electronAPI.selectFolder({ title: '파일을 복사할 폴더 선택' });
        if (!selectResponse.success || !selectResponse.data?.folderPath) return;

        showLoading({ operationType: 'copy', description: '파일 복사 중...' });
        try {
            const response = await window.electronAPI.copyFilesToFolder({
                files: [{ id: file.id, filename: file.filename }],
                targetDir: selectResponse.data.folderPath,
            });

            handleFileTransferResponse(response, 'copy', showToast);
        } finally {
            hideLoading();
        }
    };

    /** 선택된 파일들을 사용자 선택 폴더로 이동한다. */
    const handleMoveSelectedFiles = useCallback(async () => {
        if (typeof window === 'undefined' || !window.electronAPI || selectedFileIds.size === 0) return;

        const filesToMove = fileList
            .filter((file) => selectedFileIds.has(file.id))
            .map((file) => ({ id: file.id, filename: file.filename }));

        if (filesToMove.length === 0) return;

        const selectResponse = await window.electronAPI.selectFolder({ title: '파일을 이동할 폴더 선택' });
        if (!selectResponse.success || !selectResponse.data?.folderPath) return;

        showLoading({ operationType: 'move', description: '파일 이동 중...' });
        try {
            const response = await window.electronAPI.moveFilesToFolder({
                files: filesToMove,
                targetDir: selectResponse.data.folderPath,
            });

            if (handleFileTransferResponse(response, 'move', showToast)) {
                setSelectedFileIds(new Set());
                await loadFiles();
            }
        } finally {
            hideLoading();
        }
    }, [fileList, hideLoading, loadFiles, selectedFileIds, showLoading, showToast]);

    /** 선택된 파일들을 사용자 선택 폴더로 복사한다. */
    const handleCopySelectedFiles = useCallback(async () => {
        if (typeof window === 'undefined' || !window.electronAPI || selectedFileIds.size === 0) return;

        const filesToCopy = fileList
            .filter((file) => selectedFileIds.has(file.id))
            .map((file) => ({ id: file.id, filename: file.filename }));

        if (filesToCopy.length === 0) return;

        const selectResponse = await window.electronAPI.selectFolder({ title: '파일을 복사할 폴더 선택' });
        if (!selectResponse.success || !selectResponse.data?.folderPath) return;

        showLoading({ operationType: 'copy', description: '파일 복사 중...' });
        try {
            const response = await window.electronAPI.copyFilesToFolder({
                files: filesToCopy,
                targetDir: selectResponse.data.folderPath,
            });

            handleFileTransferResponse(response, 'copy', showToast);
        } finally {
            hideLoading();
        }
    }, [fileList, hideLoading, selectedFileIds, showLoading, showToast]);

    /** 단일 파일 태그 편집 모달을 연다. */
    const handleOpenTagEditor = (file: FileWithTags) => {
        setTagEditorFiles([file]);
    };

    /** 선택된 여러 파일을 한 번에 태그 편집 대상으로 연다. */
    const handleOpenBulkTagEditor = useCallback(() => {
        const filesToEdit = fileList.filter((file) => selectedFileIds.has(file.id));
        if (filesToEdit.length === 0) return;

        setTagEditorFiles(filesToEdit);
    }, [fileList, selectedFileIds]);

    /** 단일/다중 파일 태그 저장 요청을 적절한 IPC로 위임한다. */
    const handleSaveFileTags = async (fileIds: number[], tagIds: number[]) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const response = fileIds.length === 1
            ? await window.electronAPI.updateFileTags({ fileId: fileIds[0], tagIds })
            : await window.electronAPI.bulkSetFileTags({ fileIds, tagIds });

        if (!response.success) {
            showToast({
                type: 'error',
                message: response.error || '태그 수정에 실패했습니다.',
                duration: 4000,
            });
            return;
        }

        showToast({
            type: 'success',
            message: `${fileIds.length}개 파일의 태그가 수정되었습니다.`,
            duration: 3000,
        });

        setTagEditorFiles(null);
        setSelectedFileIds(new Set());
        await loadFiles();
    };

    // ===== 로딩 화면 =====
    if (isLoading) {
        return (
            <main className="screen-center">
                <p className="text-muted">Loading...</p>
            </main>
        );
    }

    // ===== Vault 미설정 화면 =====
    if (!vaultPath) {
        return (
            <main className="screen-center">
                <div className="welcome-card">
                    <h1 className="welcome-title">Welcome to LocalTag</h1>
                    <p className="welcome-description">
                        파일을 관리할 위치를 선택해 주세요.
                        <br />
                        선택한 위치에 <code className="welcome-code">MyTaggedFiles</code> 폴더가 자동으로 생성됩니다.
                    </p>
                    <button
                        onClick={handleSelectVault}
                        className="button button--primary welcome-button"
                    >
                        저장 위치 선택
                    </button>
                </div>
            </main>
        );
    }

    // ===== 메인 레이아웃 (사이드바 + 콘텐츠) =====
    return (
        <div className="app-layout">
            <TagSidebar
                tags={tagList}
                selectedTagIds={selectedTagIds}
                overallFileCount={overallFileCount}
                untaggedFileCount={untaggedFileCount}
                onCreateTag={handleOpenCreateModal}
                onEditTag={handleOpenEditModal}
                onDeleteTag={handleDeleteTag}
                onCreateChildTag={handleOpenCreateChildModal}
                onSelectTag={handleSelectTag}
                onReorderTags={handleReorderTags}
                onToggleFavorite={handleToggleFavorite}
            />

            <main className="main-content">
                <UpdateBanner {...updateState} />

                <div className="main-content__header">
                    <div className="main-content__header-left">
                        <span className="main-content__header-icon">📁</span>
                        <span className="main-content__file-count">({totalCount})</span>
                        {selectedTagIds.length > 0 && (
                            <button
                                className="main-content__clear-filter"
                                onClick={() => setSelectedTagIds([])}
                            >
                                ✕ 필터 해제
                            </button>
                        )}
                        <h1 className="main-content__title">
                            {selectedTagNames ? selectedTagNames : '전체 파일'}
                        </h1>
                    </div>
                    <div className="main-content__header-right">
                        <button
                            className={`collect-settings-button${isCollectEnabled ? ' collect-settings-button--active' : ''}`}
                            onClick={() => setIsCollectModalOpen(true)}
                            title={`다운로드 자동 수집 설정 (${isCollectEnabled ? '켜짐' : '꺼짐'})`}
                            type="button"
                        >
                            {isCollectEnabled && <span className="collect-settings-button__indicator" />}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        </button>
                        <AutoStartToggle />
                        <ThemeToggle />
                    </div>
                </div>

                <div className="main-content__body">
                    <VaultInfo
                        vaultPath={vaultPath}
                        isSyncing={isSyncing}
                        isRelocating={isRelocating}
                        onSync={() => handleSync(false)}
                        onVaultRelocated={(newPath) => setVaultPath(newPath)}
                        onRelocatingChange={setIsRelocating}
                        refreshTrigger={storageRefreshTrigger}
                    />

                    <FileList
                        files={fileList}
                        selectedFileIds={selectedFileIds}
                        currentPage={currentPage}
                        totalCount={totalCount}
                        sortOption={sortOption}
                        onSortChange={setSortOption}
                        onPageChange={setCurrentPage}
                        onToggleSelect={handleToggleFileSelection}
                        onToggleAllSelect={handleToggleAllFileSelection}
                        onAddFiles={handleAddFiles}
                        onDropFiles={handleDropFiles}
                        onRenameFile={isSyncing ? async () => { } : handleRenameFile}
                        onDeleteFile={isSyncing ? async () => { } : handleDeleteFile}
                        onDeleteSelected={isSyncing ? async () => { } : handleDeleteSelectedFiles}
                        onMoveFile={isSyncing ? () => { } : handleMoveFile}
                        onCopyFile={isSyncing ? () => { } : handleCopyFile}
                        onMoveSelected={isSyncing ? () => { } : handleMoveSelectedFiles}
                        onCopySelected={isSyncing ? () => { } : handleCopySelectedFiles}
                        onEditFileTags={handleOpenTagEditor}
                        onEditSelectedTags={handleOpenBulkTagEditor}
                        isSyncing={isSyncing}
                        searchKeyword={searchKeyword}
                        onSearchChange={setSearchKeyword}
                    />
                </div>
            </main>

            <TagFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmitTag}
                existingTag={editingTag}
                allTags={tagList}
                defaultParentId={defaultParentId}
            />

            <AutoCollectSettingsModal
                isOpen={isCollectModalOpen}
                onClose={() => setIsCollectModalOpen(false)}
                allTags={tagList}
                onSettingsChanged={() => {
                    window.electronAPI.getAutoCollectSettings().then((response) => {
                        if (response.success && response.data) {
                            setIsCollectEnabled(response.data.enabled);
                        }
                    });
                }}
            />

            {tagEditorFiles && (
                <FileTagEditor
                    isOpen={true}
                    selectedFiles={tagEditorFiles}
                    allTags={tagList}
                    onSave={handleSaveFileTags}
                    onClose={() => setTagEditorFiles(null)}
                />
            )}
        </div>
    );
}

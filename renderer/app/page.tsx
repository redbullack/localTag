'use client';

import { useCallback, useEffect, useState } from 'react';
import FileList from './components/file-list/file-list';
import FileTagEditor from './components/file-tag-editor/file-tag-editor';
import { useToast } from './components/shared/toast-provider';
import TagFormModal from './components/tag-form-modal/tag-form-modal';
import TagSidebar from './components/tag-sidebar/tag-sidebar';
import type { FileWithTags, SortOption, Tag } from './types';
import './components/tag-badge/tag-badge.css';

export default function Home() {
    const [vaultPath, setVaultPath] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const { showToast } = useToast();

    // 태그 상태
    const [tagList, setTagList] = useState<Tag[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [defaultParentId, setDefaultParentId] = useState<number | null>(null);

    // 파일 상태
    const [fileList, setFileList] = useState<FileWithTags[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [selectedFileIds, setSelectedFileIds] = useState<Set<number>>(new Set());

    // 페이징/정렬 상태
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [overallFileCount, setOverallFileCount] = useState(0);
    const [sortOption, setSortOption] = useState<SortOption>({ column: 'updatedAt', order: 'desc' });

    // 파일 태그 에디터 상태
    const [tagEditorFiles, setTagEditorFiles] = useState<FileWithTags[] | null>(null);

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

        const response = selectedTagIds.length > 0
            ? await window.electronAPI.getFilesByTags({
                tagIds: selectedTagIds,
                page: currentPage,
                limit: 50,
                sort: sortOption,
            })
            : await window.electronAPI.getAllFiles({
                page: currentPage,
                limit: 50,
                sort: sortOption,
            });

        if (response.success && response.data) {
            setFileList(response.data);
            if (response.totalCount !== undefined) {
                setTotalCount(response.totalCount);
            }
        }

        const countResponse = await window.electronAPI.getTotalFileCount();
        if (countResponse.success && countResponse.data !== undefined) {
            setOverallFileCount(countResponse.data);
        }
    }, [currentPage, selectedTagIds, sortOption]);

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

    // ── Vault 동기화 (Sync) ──

    /** 원본 폴더와 DB를 비교해 변경 사항을 동기화한다. */
    const handleSync = useCallback(async (isSilent = false) => {
        if (typeof window === 'undefined' || !window.electronAPI || !vaultPath || isSyncing) return;

        setIsSyncing(true);
        try {
            const response = await window.electronAPI.syncFiles();

            if (response.success && response.data) {
                const { addedCount, deletedCount, updatedCount } = response.data;
                const totalChanges = addedCount + deletedCount + updatedCount;

                if (totalChanges > 0) {
                    await loadTags();
                    await loadFiles();

                    const messageParts = [];
                    if (addedCount > 0) messageParts.push(`${addedCount}개 추가`);
                    if (deletedCount > 0) messageParts.push(`${deletedCount}개 삭제`);
                    if (updatedCount > 0) messageParts.push(`${updatedCount}개 갱신`);

                    showToast({
                        message: `동기화 완료: ${messageParts.join(', ')}`,
                        duration: 4000,
                    });
                } else if (!isSilent) {
                    showToast({
                        message: '모든 파일이 최신 상태입니다.',
                        duration: 3000,
                    });
                }
            } else if (!isSilent) {
                showToast({
                    message: response.error || '동기화 중 오류가 발생했습니다.',
                    duration: 4000,
                });
            }
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, loadFiles, loadTags, showToast, vaultPath]);

    /** 앱이 다시 포커스를 얻으면 조용히 동기화한다. */
    useEffect(() => {
        const handleFocus = () => {
            if (vaultPath && !isSyncing) {
                handleSync(true);
            }
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
            alert(response.error || (editingTag ? '태그 수정에 실패했습니다.' : '태그 생성에 실패했습니다.'));
            return;
        }

        handleCloseModal();
        await loadTags();
    };

    /** 태그 삭제 후 현재 필터와 목록을 함께 정리한다. */
    const handleDeleteTag = async (tagId: number) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const confirmDelete = confirm('이 태그를 삭제하시겠습니까?\n하위 태그도 함께 삭제됩니다.');
        if (!confirmDelete) return;

        const response = await window.electronAPI.deleteTag({ id: tagId });
        if (!response.success) {
            alert(response.error || '태그 삭제에 실패했습니다.');
            return;
        }

        if (selectedTagIds.includes(tagId)) {
            setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
        }

        await loadTags();
        await loadFiles();
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

    /** 현재 선택된 태그 이름을 파일 추가/헤더 표시에 사용한다. */
    const selectedTagNames = selectedTagIds.length > 0
        ? selectedTagIds
            .map((id) => tagList.find((tag) => tag.id === id)?.name)
            .filter(Boolean)
            .join(', ')
        : null;

    const getAddFilesConfirmText = (fileCount: number) => {
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
                alert(selectResponse.error);
            }
            return;
        }

        const filePaths = selectResponse.data.filePaths;
        const confirmResult = confirm(getAddFilesConfirmText(filePaths.length));
        if (!confirmResult) return;

        const addResponse = await window.electronAPI.addFiles({
            tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
            filePaths,
        });

        if (!addResponse.success) {
            if (addResponse.duplicates && addResponse.duplicates.length > 0) {
                alert(`다음 파일명이 이미 존재합니다:\n${addResponse.duplicates.join('\n')}`);
            } else if (addResponse.error) {
                alert(addResponse.error);
            }
            return;
        }

        await loadFiles();
    };

    /** 드래그 앤 드롭으로 전달된 파일 목록을 추가한다. */
    const handleDropFiles = async (filePaths: string[]) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const confirmResult = confirm(getAddFilesConfirmText(filePaths.length));
        if (!confirmResult) return;

        const response = await window.electronAPI.addFiles({
            tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
            filePaths,
        });

        if (!response.success) {
            if (response.duplicates && response.duplicates.length > 0) {
                alert(`다음 파일명이 이미 존재합니다:\n${response.duplicates.join('\n')}`);
            } else if (response.error) {
                alert(response.error);
            }
            return;
        }

        await loadFiles();
    };

    /** 개별 파일 이름을 변경한다. */
    const handleRenameFile = async (fileId: number, newFilename: string) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const response = await window.electronAPI.renameFile({ id: fileId, newFilename });
        if (response.success) {
            await loadFiles();
        } else {
            alert(response.error || '파일 이름 변경에 실패했습니다.');
        }
    };

    /** 개별 파일을 삭제한다. */
    const handleDeleteFile = async (fileId: number, skipConfirmation: boolean = false) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        if (!skipConfirmation) {
            const confirmDelete = confirm('이 파일을 삭제하시겠습니까?\n파일시스템에서도 제거됩니다.');
            if (!confirmDelete) return;
        }

        const response = await window.electronAPI.deleteFile({ id: fileId });
        if (response.success) {
            await loadFiles();
        } else {
            alert(response.error || '파일 삭제에 실패했습니다.');
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
        const confirmDelete = confirm(`${fileIds.length}개의 파일을 삭제하시겠습니까?`);
        if (!confirmDelete) return;

        const results = await Promise.all(
            fileIds.map((fileId) => window.electronAPI.deleteFile({ id: fileId })),
        );
        const failedResult = results.find((result) => !result.success);

        if (failedResult) {
            alert(failedResult.error || '선택한 파일 삭제 중 오류가 발생했습니다.');
        }

        setSelectedFileIds(new Set());
        await loadFiles();
    }, [loadFiles, selectedFileIds]);

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
            alert(response.error || '태그 수정에 실패했습니다.');
            return;
        }

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
                onCreateTag={handleOpenCreateModal}
                onEditTag={handleOpenEditModal}
                onDeleteTag={handleDeleteTag}
                onCreateChildTag={handleOpenCreateChildModal}
                onSelectTag={handleSelectTag}
            />

            <main className="main-content">
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
                </div>

                <div className="main-content__body">
                    <div
                        className="vault-info"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
                    >
                        <div>
                            <span className="vault-info__label">Vault 경로</span>
                            <code className="vault-info__path">{vaultPath}</code>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-danger, #f87171)', marginTop: '4px', fontWeight: 500 }}>
                                ⚠️ 주의: 원본 폴더(MyTaggedFiles)에서 파일을 수동으로 이동하거나 삭제하지 마세요.
                            </div>
                        </div>
                        <button
                            className="sync-button"
                            data-tooltip="원본 폴더와 DB를 비교하여 파일 추가, 삭제, 메타데이터 변경 사항을 최신 상태로 맞춥니다."
                            onClick={() => handleSync(false)}
                            disabled={isSyncing}
                        >
                            <span className={isSyncing ? 'spin-animation' : ''}>🔄</span>
                            {isSyncing ? '동기화 중...' : '동기화'}
                        </button>
                    </div>

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
                        onEditFileTags={handleOpenTagEditor}
                        onEditSelectedTags={handleOpenBulkTagEditor}
                        isSyncing={isSyncing}
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


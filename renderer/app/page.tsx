'use client';

import { useEffect, useState, useCallback } from 'react';
import TagSidebar from './components/tag-sidebar/tag-sidebar';
import TagFormModal from './components/tag-form-modal/tag-form-modal';
import FileList from './components/file-list/file-list';
import FileTagEditor from './components/file-tag-editor/file-tag-editor';
import type { Tag, FileWithTags, SortOption } from './types';
import './components/tag-badge/tag-badge.css';

export default function Home() {
    const [vaultPath, setVaultPath] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 태그 상태
    const [tagList, setTagList] = useState<Tag[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [defaultParentId, setDefaultParentId] = useState<number | null>(null);

    // 파일 상태
    const [fileList, setFileList] = useState<FileWithTags[]>([]);
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

    // 페이징 상태
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [overallFileCount, setOverallFileCount] = useState(0);

    // 파일 정렬 상태
    const [sortOption, setSortOption] = useState<SortOption>({ column: 'updatedAt', order: 'desc' });

    // 파일 태그 에디터 상태
    const [tagEditorFile, setTagEditorFile] = useState<FileWithTags | null>(null);

    /** Vault 경로 확인 */
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

    /** 태그 목록 로드 */
    const loadTags = useCallback(async () => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const response = await window.electronAPI.getAllTags();
        if (response.success && response.data) {
            setTagList(response.data);
        }
    }, []);

    /** 파일 목록 로드 */
    const loadFiles = useCallback(async () => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        let response;
        if (selectedTagIds.length > 0) {
            response = await window.electronAPI.getFilesByTags({ tagIds: selectedTagIds, page: currentPage, limit: 50, sort: sortOption });
        } else {
            response = await window.electronAPI.getAllFiles({ page: currentPage, limit: 50, sort: sortOption });
        }

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
    }, [selectedTagIds, currentPage, sortOption]);

    /** Vault 설정 완료 후 태그 + 파일 로드 */
    useEffect(() => {
        if (vaultPath) {
            loadTags();
            loadFiles();
        }
    }, [vaultPath, loadTags, loadFiles]);

    // ── Vault ──

    const handleSelectVault = async () => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            const selectedPath = await window.electronAPI.selectVaultPath();
            if (selectedPath) {
                setVaultPath(selectedPath);
            }
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

    const handleSubmitTag = async (formData: { name: string; color: string; parentId: number | null }) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        if (editingTag) {
            const response = await window.electronAPI.updateTag({
                id: editingTag.id,
                name: formData.name,
                color: formData.color,
                parentId: formData.parentId,
            });
            if (!response.success) {
                alert(response.error || '태그 수정에 실패했습니다.');
                return;
            }
        } else {
            const response = await window.electronAPI.createTag({
                name: formData.name,
                color: formData.color,
                parentId: formData.parentId ?? undefined,
            });
            if (!response.success) {
                alert(response.error || '태그 생성에 실패했습니다.');
                return;
            }
        }

        handleCloseModal();
        await loadTags();
    };

    const handleDeleteTag = async (tagId: number) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const confirmDelete = confirm('이 태그를 삭제하시겠습니까?\n하위 태그도 함께 삭제됩니다.');
        if (!confirmDelete) return;

        const response = await window.electronAPI.deleteTag({ id: tagId });
        if (response.success) {
            if (selectedTagIds.includes(tagId)) {
                setSelectedTagIds(prev => prev.filter(id => id !== tagId));
            }
            await loadTags();
            await loadFiles();
        } else {
            alert(response.error || '태그 삭제에 실패했습니다.');
        }
    };

    /** 사이드바 태그 선택 (다중 토글) */
    const handleSelectTag = (tagId: number) => {
        setSelectedTagIds((prevIds) => {
            if (prevIds.includes(tagId)) {
                return prevIds.filter((id) => id !== tagId); // 해제
            } else {
                return [...prevIds, tagId]; // 선택 추가
            }
        });
        setCurrentPage(1); // 태그 필터 변경 시 첫 페이지로 이동
    };

    // ── 파일 CRUD ──

    /** 파일 추가 (OS 다이얼로그) */
    const handleAddFiles = async () => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const response = await window.electronAPI.addFiles(
            selectedTagIds.length > 0 ? { tagIds: selectedTagIds } : undefined
        );

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

    /** 파일 이름 변경 */
    const handleRenameFile = async (fileId: number, newFilename: string) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const response = await window.electronAPI.renameFile({ id: fileId, newFilename });
        if (response.success) {
            await loadFiles();
        } else {
            alert(response.error || '파일 이름 변경에 실패했습니다.');
        }
    };

    /** 파일 삭제 */
    const handleDeleteFile = async (fileId: number) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const confirmDelete = confirm('이 파일을 삭제하시겠습니까?\n파일시스템에서도 제거됩니다.');
        if (!confirmDelete) return;

        const response = await window.electronAPI.deleteFile({ id: fileId });
        if (response.success) {
            await loadFiles();
        } else {
            alert(response.error || '파일 삭제에 실패했습니다.');
        }
    };

    /** 파일 태그 에디터 열기 */
    const handleOpenTagEditor = (file: FileWithTags) => {
        setTagEditorFile(file);
    };

    /** 파일 태그 저장 */
    const handleSaveFileTags = async (fileId: number, tagIds: number[]) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const response = await window.electronAPI.updateFileTags({ fileId, tagIds });
        if (response.success) {
            setTagEditorFile(null);
            await loadFiles();
        } else {
            alert(response.error || '태그 수정에 실패했습니다.');
        }
    };

    /** 선택된 태그 이름 */
    const selectedTagNames = selectedTagIds.length > 0
        ? selectedTagIds.map(id => tagList.find(t => t.id === id)?.name).filter(Boolean).join(', ')
        : null;

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
                    <h1 className="welcome-title">
                        Welcome to LocalTag
                    </h1>
                    <p className="welcome-description">
                        파일을 관리할 위치를 선택해 주세요.<br />
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
                    <h1 className="main-content__title">
                        {selectedTagNames ? `📁 ${selectedTagNames}` : '📁 전체 파일'}
                    </h1>
                    {selectedTagIds.length > 0 && (
                        <button
                            className="main-content__clear-filter"
                            onClick={() => setSelectedTagIds([])}
                        >
                            ✕ 필터 해제
                        </button>
                    )}
                </div>
                <div className="main-content__body">
                    <div className="vault-info">
                        <span className="vault-info__label">Vault 경로</span>
                        <code className="vault-info__path">{vaultPath}</code>
                    </div>
                    <FileList
                        files={fileList}
                        currentPage={currentPage}
                        totalCount={totalCount}
                        sortOption={sortOption}
                        onSortChange={(option) => setSortOption(option)}
                        onPageChange={(page) => setCurrentPage(page)}
                        onAddFiles={handleAddFiles}
                        onRenameFile={handleRenameFile}
                        onDeleteFile={handleDeleteFile}
                        onEditFileTags={handleOpenTagEditor}
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

            {tagEditorFile && (
                <FileTagEditor
                    isOpen={true}
                    file={tagEditorFile}
                    allTags={tagList}
                    onSave={handleSaveFileTags}
                    onClose={() => setTagEditorFile(null)}
                />
            )}
        </div>
    );
}

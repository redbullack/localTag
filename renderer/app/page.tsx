'use client';

import { useEffect, useState, useCallback } from 'react';
import TagSidebar from './components/tag-sidebar/tag-sidebar';
import TagFormModal from './components/tag-form-modal/tag-form-modal';
import type { Tag } from './types';
import './components/tag-badge/tag-badge.css';

export default function Home() {
    const [vaultPath, setVaultPath] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 태그 상태
    const [tagList, setTagList] = useState<Tag[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [defaultParentId, setDefaultParentId] = useState<number | null>(null);

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

    /** Vault 설정 완료 후 태그 로드 */
    useEffect(() => {
        if (vaultPath) {
            loadTags();
        }
    }, [vaultPath, loadTags]);

    /** Vault 선택 */
    const handleSelectVault = async () => {
        if (typeof window !== 'undefined' && window.electronAPI) {
            const selectedPath = await window.electronAPI.selectVaultPath();
            if (selectedPath) {
                setVaultPath(selectedPath);
            }
        }
    };

    /** 새 태그 만들기 모달 열기 */
    const handleOpenCreateModal = () => {
        setEditingTag(null);
        setDefaultParentId(null);
        setIsModalOpen(true);
    };

    /** 하위 태그 생성 모달 열기 */
    const handleOpenCreateChildModal = (parentTag: Tag) => {
        setEditingTag(null);
        setDefaultParentId(parentTag.id);
        setIsModalOpen(true);
    };

    /** 태그 수정 모달 열기 */
    const handleOpenEditModal = (tag: Tag) => {
        setEditingTag(tag);
        setIsModalOpen(true);
    };

    /** 모달 닫기 */
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTag(null);
        setDefaultParentId(null);
    };

    /** 태그 생성/수정 제출 */
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

    /** 태그 삭제 */
    const handleDeleteTag = async (tagId: number) => {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const confirmDelete = confirm('이 태그를 삭제하시겠습니까?\n하위 태그도 함께 삭제됩니다.');
        if (!confirmDelete) return;

        const response = await window.electronAPI.deleteTag({ id: tagId });
        if (response.success) {
            await loadTags();
        } else {
            alert(response.error || '태그 삭제에 실패했습니다.');
        }
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
                onCreateTag={handleOpenCreateModal}
                onEditTag={handleOpenEditModal}
                onDeleteTag={handleDeleteTag}
                onCreateChildTag={handleOpenCreateChildModal}
            />

            <main className="main-content">
                <div className="main-content__header">
                    <h1 className="main-content__title">LocalTag</h1>
                </div>
                <div className="main-content__body">
                    <div className="vault-info">
                        <span className="vault-info__label">Vault 경로</span>
                        <code className="vault-info__path">{vaultPath}</code>
                    </div>
                    <div className="main-content__placeholder">
                        <p className="text-muted">
                            좌측 사이드바에서 태그를 생성하고 관리할 수 있습니다.
                        </p>
                    </div>
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
        </div>
    );
}

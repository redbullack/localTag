'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import './file-tag-editor.css';
import type { FileWithTags, Tag, TagTreeNode } from '../../types';

interface FileTagEditorProps {
    /** 모달 열림 여부 */
    isOpen: boolean;
    /** 편집 대상 파일 */
    file: FileWithTags;
    /** 전체 태그 목록 (드롭다운 후보) */
    allTags: Tag[];
    /** 저장 콜백 */
    onSave: (fileId: number, tagIds: number[]) => void;
    /** 닫기 콜백 */
    onClose: () => void;
}

/** flat 태그 → 계층형 트리 변환 (태그 사이드바와 동일 로직) */
const buildTagTree = (tags: Tag[]): TagTreeNode[] => {
    const tagMap = new Map<number, TagTreeNode>();
    const rootNodes: TagTreeNode[] = [];

    tags.forEach((tag) => {
        tagMap.set(tag.id, { ...tag, children: [] });
    });

    tags.forEach((tag) => {
        const treeNode = tagMap.get(tag.id)!;
        if (tag.parentId !== null && tagMap.has(tag.parentId)) {
            tagMap.get(tag.parentId)!.children.push(treeNode);
        } else {
            rootNodes.push(treeNode);
        }
    });

    return rootNodes;
};

/** 트리를 들여쓰기 레벨과 함께 flat 리스트로 변환 */
const flattenTree = (nodes: TagTreeNode[], depth: number = 0): { tag: Tag; depth: number }[] => {
    const result: { tag: Tag; depth: number }[] = [];

    for (const node of nodes) {
        result.push({ tag: node, depth });
        if (node.children.length > 0) {
            result.push(...flattenTree(node.children, depth + 1));
        }
    }

    return result;
};

export default function FileTagEditor({
    isOpen,
    file,
    allTags,
    onSave,
    onClose,
}: FileTagEditorProps) {
    const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    /** 모달 열릴 때 기존 태그 ID 세트 초기화 */
    useEffect(() => {
        if (isOpen && file) {
            setSelectedTagIds(new Set(file.tags.map((tag) => tag.id)));
            setSearchQuery('');
            setIsDropdownOpen(false);
        }
    }, [isOpen, file]);

    /** 외부 클릭/ESC 시 드롭다운 닫기 */
    useEffect(() => {
        if (!isDropdownOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isDropdownOpen) {
                    setIsDropdownOpen(false);
                } else {
                    onClose();
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isDropdownOpen, onClose]);

    /** 전체 태그 트리를 flat 리스트로 변환 (검색 + 계층 들여쓰기) */
    const flatTagList = useMemo(() => {
        const tree = buildTagTree(allTags);
        return flattenTree(tree);
    }, [allTags]);

    /** 검색으로 필터링된 태그 리스트 */
    const filteredTagList = useMemo(() => {
        if (!searchQuery.trim()) return flatTagList;

        const lowerQuery = searchQuery.toLowerCase();
        return flatTagList.filter(({ tag }) =>
            tag.name.toLowerCase().includes(lowerQuery)
        );
    }, [flatTagList, searchQuery]);

    /** 태그 토글 (추가/제거) */
    const handleToggleTag = (tagId: number) => {
        setSelectedTagIds((prev) => {
            const next = new Set(prev);
            if (next.has(tagId)) {
                next.delete(tagId);
            } else {
                next.add(tagId);
            }
            return next;
        });
    };

    /** 태그 제거 (칩 X 버튼) */
    const handleRemoveTag = (tagId: number) => {
        setSelectedTagIds((prev) => {
            const next = new Set(prev);
            next.delete(tagId);
            return next;
        });
    };

    /** 저장 */
    const handleSave = () => {
        onSave(file.id, Array.from(selectedTagIds));
    };

    /** 선택된 태그 객체 목록 */
    const selectedTags = useMemo(() => {
        return allTags.filter((tag) => selectedTagIds.has(tag.id));
    }, [allTags, selectedTagIds]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="file-tag-editor"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="file-tag-editor__header">
                    <h3 className="file-tag-editor__title">🏷️ 태그 편집</h3>
                    <button
                        className="file-tag-editor__close-btn"
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        ✕
                    </button>
                </div>

                {/* 파일 정보 */}
                <div className="file-tag-editor__file-info">
                    📄 {file.filename}
                </div>

                {/* 현재 선택된 태그 (칩 목록) */}
                <div className="file-tag-editor__section-label">현재 태그</div>
                <div className="file-tag-editor__chips">
                    {selectedTags.length === 0 ? (
                        <span className="file-tag-editor__no-tags">선택된 태그 없음</span>
                    ) : (
                        selectedTags.map((tag) => (
                            <span
                                key={tag.id}
                                className="tag-badge"
                                style={{ '--tag-color': tag.color || '#5865f2' } as React.CSSProperties}
                            >
                                <span className="tag-badge__dot" />
                                <span className="tag-badge__name">{tag.name}</span>
                                <button
                                    className="tag-badge__close"
                                    onClick={() => handleRemoveTag(tag.id)}
                                    aria-label={`${tag.name} 태그 제거`}
                                >
                                    ✕
                                </button>
                            </span>
                        ))
                    )}
                </div>

                {/* 태그 검색 + 드롭다운 */}
                <div className="file-tag-editor__section-label">태그 추가</div>
                <div className="file-tag-editor__search-wrapper" ref={dropdownRef}>
                    <input
                        ref={searchInputRef}
                        className="file-tag-editor__search-input"
                        type="text"
                        placeholder="🔍 태그 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsDropdownOpen(true)}
                    />

                    {isDropdownOpen && (
                        <div className="file-tag-editor__dropdown">
                            {filteredTagList.length === 0 ? (
                                <div className="file-tag-editor__dropdown-empty">
                                    일치하는 태그가 없습니다
                                </div>
                            ) : (
                                filteredTagList.map(({ tag, depth }) => {
                                    const isSelected = selectedTagIds.has(tag.id);
                                    return (
                                        <button
                                            key={tag.id}
                                            className={`file-tag-editor__dropdown-item ${isSelected ? 'file-tag-editor__dropdown-item--selected' : ''}`}
                                            style={{ paddingLeft: `${12 + depth * 16}px` }}
                                            onClick={() => handleToggleTag(tag.id)}
                                        >
                                            <span
                                                className="file-tag-editor__dropdown-dot"
                                                style={{ backgroundColor: tag.color || '#5865f2' }}
                                            />
                                            <span className="file-tag-editor__dropdown-name">
                                                {tag.name}
                                            </span>
                                            {isSelected && (
                                                <span className="file-tag-editor__dropdown-check">✓</span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* 하단 버튼 */}
                <div className="file-tag-editor__footer">
                    <button
                        className="file-tag-editor__cancel-btn"
                        onClick={onClose}
                    >
                        취소
                    </button>
                    <button
                        className="file-tag-editor__save-btn"
                        onClick={handleSave}
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
}

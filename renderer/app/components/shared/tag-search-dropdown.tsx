'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import './tag-search-dropdown.css';
import type { Tag } from '../../types';
import { buildTagTree, flattenTree } from '../../utils/tag-tree';

export type SelectionMode = 'single' | 'multiple';

interface TagSearchDropdownProps {
    /** 전체 태그 리스트 */
    tags: Tag[];
    /** 선택된 태그 ID 세트 (단일일 경우에도 Set으로 관리) */
    selectedTagIds: Set<number>;
    /** 태그를 클릭했을 때의 동작 (단일, 다중 선택에 따라 부모가 처리) */
    onSelectTag: (tagId: number | null) => void;
    /** 단일 선택인지 다중 선택인지 */
    selectionMode: SelectionMode;
    /** 단일 선택 모드일 때 "없음 (루트 태그)" 옵션을 보여줄지 여부 */
    showRootOption?: boolean;
    /** 검색창 placeholder 문자열 */
    searchPlaceholder?: string;
    /** 추가적인 CSS 클래스 (컨테이너용) */
    className?: string;
    /** 컴포넌트 마운트 시 검색창에 포커스를 줄지 여부 */
    autoFocus?: boolean;
}

export default function TagSearchDropdown({
    tags,
    selectedTagIds,
    onSelectTag,
    selectionMode,
    showRootOption = false,
    searchPlaceholder = '🔍 검색...',
    className = '',
    autoFocus = false,
}: TagSearchDropdownProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 컴포넌트 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // 컴포넌트가 마운트되거나 autoFocus 값이 변경될 때 포커스 제어
    useEffect(() => {
        if (autoFocus && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [autoFocus]);

    // 계층형 리스트 평탄화
    const flatTagList = useMemo(() => {
        const tree = buildTagTree(tags);
        return flattenTree(tree);
    }, [tags]);

    // 검색어로 필터링
    const filteredTagList = useMemo(() => {
        if (!searchQuery.trim()) return flatTagList;

        const lowerQuery = searchQuery.toLowerCase();
        return flatTagList.filter(({ tag }) =>
            tag.name.toLowerCase().includes(lowerQuery)
        );
    }, [flatTagList, searchQuery]);

    const isRootSelected = selectionMode === 'single' && selectedTagIds.size === 0;

    return (
        <div className={`tag-search-dropdown ${className}`} ref={dropdownRef}>
            <input
                ref={searchInputRef}
                className="tag-search-dropdown__input"
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isDropdownOpen && (
                <ul className="tag-search-dropdown__list" role="listbox">
                    {/* 단일 선택 모드 & showRootOption이 true일 때만 "없음" 옵션 렌더링 */}
                    {selectionMode === 'single' && showRootOption && (
                        <li
                            className={`tag-search-dropdown__item ${isRootSelected ? 'tag-search-dropdown__item--selected' : ''}`}
                            role="option"
                            aria-selected={isRootSelected}
                            onClick={() => {
                                onSelectTag(null);
                                setIsDropdownOpen(false);
                            }}
                        >
                            없음 (루트 태그)
                        </li>
                    )}

                    {/* 태그 리스트 렌더링 */}
                    {filteredTagList.length === 0 ? (
                        <li className="tag-search-dropdown__empty">
                            일치하는 태그가 없습니다
                        </li>
                    ) : (
                        filteredTagList.map(({ tag, depth }) => {
                            const isSelected = selectedTagIds.has(tag.id);
                            return (
                                <button
                                    type="button"
                                    key={tag.id}
                                    className={`tag-search-dropdown__item ${isSelected ? 'tag-search-dropdown__item--selected' : ''}`}
                                    role="option"
                                    aria-selected={isSelected}
                                    style={{ paddingLeft: `${10 + depth * 16}px` }}
                                    onClick={() => {
                                        onSelectTag(tag.id);
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    <span
                                        className="tag-color-dot"
                                        style={{
                                            backgroundColor: tag.color || '#99aab5',
                                        }}
                                    />
                                    {tag.name}
                                    {/* 만약 다중 선택 모드이고, 선택된 상태라면 체크 표시 렌더링 */}
                                    {selectionMode === 'multiple' && isSelected && (
                                        <span className="tag-search-dropdown__item-check">
                                            ✓
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </ul>
            )}
        </div>
    );
}

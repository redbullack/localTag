'use client';

import { useState, useRef, useEffect } from 'react';
import './parent-tag-select.css';
import type { Tag } from '../../types';

interface ParentTagSelectProps {
    tags: Tag[];
    selectedParentId: number | null;
    onChange: (parentId: number | null) => void;
}

export default function ParentTagSelect({
    tags,
    selectedParentId,
    onChange,
}: ParentTagSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedTag = tags.find((tag) => tag.id === selectedParentId) ?? null;

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleSelect = (parentId: number | null) => {
        onChange(parentId);
        setIsOpen(false);
    };

    return (
        <div
            className="parent-select"
            ref={containerRef}
            onKeyDown={handleKeyDown}
        >
            {/* 트리거 버튼 */}
            <button
                type="button"
                className="parent-select__trigger"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="parent-select__value">
                    {selectedTag ? (
                        <>
                            <span
                                className="tag-color-dot"
                                style={{
                                    backgroundColor:
                                        selectedTag.color || '#99aab5',
                                }}
                            />
                            {selectedTag.name}
                        </>
                    ) : (
                        '없음 (루트 태그)'
                    )}
                </span>
                <span
                    className={`parent-select__arrow ${isOpen ? 'parent-select__arrow--open' : ''}`}
                >
                    ▾
                </span>
            </button>

            {/* 드롭다운 옵션 리스트 */}
            {isOpen && (
                <ul className="parent-select__dropdown" role="listbox">
                    <li
                        className={`parent-select__option ${selectedParentId === null ? 'parent-select__option--selected' : ''}`}
                        role="option"
                        aria-selected={selectedParentId === null}
                        onClick={() => handleSelect(null)}
                    >
                        없음 (루트 태그)
                    </li>
                    {tags.map((tag) => (
                        <li
                            key={tag.id}
                            className={`parent-select__option ${selectedParentId === tag.id ? 'parent-select__option--selected' : ''}`}
                            role="option"
                            aria-selected={selectedParentId === tag.id}
                            onClick={() => handleSelect(tag.id)}
                        >
                            <span
                                className="tag-color-dot"
                                style={{
                                    backgroundColor: tag.color || '#99aab5',
                                }}
                            />
                            {tag.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

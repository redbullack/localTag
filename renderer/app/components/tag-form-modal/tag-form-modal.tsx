'use client';

import { useState, useEffect } from 'react';
import './tag-form-modal.css';
import type { Tag } from '../../types';

/**
 * TagFormModal - 태그 생성/수정 모달 컴포넌트
 *
 * @param isOpen - 모달 열림 여부
 * @param onClose - 모달 닫기 콜백
 * @param onSubmit - 저장 콜백 (name, color, parentId)
 * @param existingTag - 수정 모드일 때 기존 태그 데이터 (없으면 생성 모드)
 * @param allTags - 부모 태그 선택을 위한 전체 태그 목록
 */

interface TagFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; color: string; parentId: number | null }) => void;
    existingTag?: Tag | null;
    allTags: Tag[];
}

const COLOR_PRESETS = [
    '#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245',
    '#3ba55d', '#faa61a', '#5865f2', '#99aab5', '#e67e22',
    '#1abc9c', '#e91e63', '#9b59b6', '#2ecc71', '#e74c3c',
    '#f39c12',
];

export default function TagFormModal({
    isOpen,
    onClose,
    onSubmit,
    existingTag = null,
    allTags,
}: TagFormModalProps) {
    const [tagName, setTagName] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
    const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const isEditMode = existingTag !== null;

    useEffect(() => {
        if (isOpen) {
            if (existingTag) {
                setTagName(existingTag.name);
                setSelectedColor(existingTag.color || COLOR_PRESETS[0]);
                setSelectedParentId(existingTag.parentId);
            } else {
                setTagName('');
                setSelectedColor(COLOR_PRESETS[0]);
                setSelectedParentId(null);
            }
            setErrorMessage('');
        }
    }, [isOpen, existingTag]);

    const handleSubmit = () => {
        const trimmedName = tagName.trim();
        if (!trimmedName) {
            setErrorMessage('태그 이름을 입력해 주세요.');
            return;
        }

        onSubmit({
            name: trimmedName,
            color: selectedColor,
            parentId: selectedParentId,
        });
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };

    // 부모 태그 선택 시, 자기 자신과 자기 하위 태그는 제외 (수정 모드)
    const availableParentTags = allTags.filter((tag) => {
        if (!existingTag) return true;
        return tag.id !== existingTag.id;
    });

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container" onKeyDown={handleKeyDown}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {isEditMode ? '태그 수정' : '새 태그 만들기'}
                    </h2>
                    <button className="modal-close-button" onClick={onClose} aria-label="닫기">
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    {/* 태그 이름 입력 */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="tag-name-input">
                            태그 이름
                        </label>
                        <input
                            id="tag-name-input"
                            className="form-input"
                            type="text"
                            value={tagName}
                            onChange={(e) => {
                                setTagName(e.target.value);
                                setErrorMessage('');
                            }}
                            placeholder="태그 이름을 입력하세요"
                            maxLength={50}
                            autoFocus
                        />
                        {errorMessage && (
                            <p className="form-error">{errorMessage}</p>
                        )}
                    </div>

                    {/* 색상 선택 */}
                    <div className="form-group">
                        <label className="form-label">색상</label>
                        <div className="color-palette">
                            {COLOR_PRESETS.map((color) => (
                                <button
                                    key={color}
                                    className={`color-swatch ${selectedColor === color ? 'color-swatch--selected' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setSelectedColor(color)}
                                    aria-label={`색상 ${color}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* 부모 태그 선택 */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="parent-tag-select">
                            상위 태그 (선택사항)
                        </label>
                        <select
                            id="parent-tag-select"
                            className="form-select"
                            value={selectedParentId ?? ''}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSelectedParentId(value === '' ? null : Number(value));
                            }}
                        >
                            <option value="">없음 (루트 태그)</option>
                            {availableParentTags.map((tag) => (
                                <option key={tag.id} value={tag.id}>
                                    {tag.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="button button--secondary" onClick={onClose}>
                        취소
                    </button>
                    <button className="button button--primary" onClick={handleSubmit}>
                        {isEditMode ? '수정' : '생성'}
                    </button>
                </div>
            </div>
        </div>
    );
}

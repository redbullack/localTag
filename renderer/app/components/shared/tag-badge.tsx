'use client';

import { DEFAULT_TAG_COLOR } from '../../constants';

/**
 * TagBadge - 태그 이름과 색상을 표시하는 소형 뱃지 컴포넌트
 *
 * @param name - 태그 이름
 * @param color - 태그 색상 (HEX 코드). null이면 기본 색상 사용
 * @param onClose - 닫기(X) 버튼 클릭 콜백. 제공하지 않으면 X 버튼 숨김
 */

interface TagBadgeProps {
    name: string;
    color: string | null;
    onClose?: () => void;
}

export default function TagBadge({ name, color, onClose }: TagBadgeProps) {
    const tagColor = color || DEFAULT_TAG_COLOR;

    return (
        <span
            className="tag-badge"
            style={{ '--tag-color': tagColor } as React.CSSProperties}
        >
            <span className="tag-badge__dot" />
            <span className="tag-badge__name">{name}</span>
            {onClose && (
                <button
                    className="tag-badge__close"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    aria-label={`${name} 태그 제거`}
                >
                    ×
                </button>
            )}
        </span>
    );
}

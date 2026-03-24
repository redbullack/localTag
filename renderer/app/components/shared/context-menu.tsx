'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import './context-menu.css';
import { useClickOutside } from '../../utils/use-click-outside';

export interface ContextMenuItem {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    danger?: boolean;
}

interface ContextMenuProps {
    items: ContextMenuItem[];
    position: { x: number; y: number };
    onClose: () => void;
}

export default function ContextMenu({ items, position, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState(position);

    useClickOutside(menuRef, onClose);

    /** viewport 경계를 벗어나지 않도록 위치를 보정한다. */
    useEffect(() => {
        if (!menuRef.current) return;

        const rect = menuRef.current.getBoundingClientRect();
        let { x, y } = position;

        if (x + rect.width > window.innerWidth) {
            x = window.innerWidth - rect.width - 8;
        }
        if (y + rect.height > window.innerHeight) {
            y = window.innerHeight - rect.height - 8;
        }
        if (x < 0) x = 8;
        if (y < 0) y = 8;

        setAdjustedPos({ x, y });
    }, [position]);

    /** Escape 키로 메뉴를 닫는다. */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="context-menu"
            style={{ top: adjustedPos.y, left: adjustedPos.x }}
            onClick={(e) => e.stopPropagation()}
        >
            {items.map((item, index) => (
                <button
                    key={index}
                    className={`context-menu__item ${item.danger ? 'context-menu__item--danger' : ''}`}
                    onClick={() => {
                        item.onClick();
                        onClose();
                    }}
                >
                    <span className="context-menu__item-icon">{item.icon}</span>
                    <span className="context-menu__item-label">{item.label}</span>
                </button>
            ))}
        </div>
    );
}

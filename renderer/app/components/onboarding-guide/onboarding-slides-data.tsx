import React from 'react';

export interface OnboardingSlideData {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const VaultIcon = () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="16" width="48" height="36" rx="4" stroke="var(--accent-primary)" strokeWidth="2.5" fill="var(--bg-secondary)" />
        <path d="M8 24h48" stroke="var(--accent-primary)" strokeWidth="2.5" />
        <circle cx="32" cy="38" r="6" stroke="var(--accent-primary)" strokeWidth="2" fill="none" />
        <path d="M32 35v6M29 38h6" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 16V12a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v4" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

const FileAddIcon = () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="14" y="8" width="28" height="36" rx="3" stroke="var(--text-secondary)" strokeWidth="2" fill="var(--bg-secondary)" />
        <path d="M20 20h16M20 26h12M20 32h8" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
        <path d="M38 28l10-10M48 18l-2 10-8-8z" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="30" y="38" width="24" height="18" rx="3" stroke="var(--accent-primary)" strokeWidth="2.5" fill="var(--bg-secondary)" />
        <path d="M42 43v8M38 47h8" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
);

const TagTreeIcon = () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="16" cy="20" r="5" fill="#5865f2" opacity="0.9" />
        <circle cx="32" cy="12" r="4" fill="#ed4245" opacity="0.9" />
        <circle cx="32" cy="28" r="4" fill="#57f287" opacity="0.9" />
        <circle cx="48" cy="20" r="3.5" fill="#fee75c" opacity="0.9" />
        <circle cx="48" cy="36" r="3.5" fill="#eb459e" opacity="0.9" />
        <path d="M21 18l7-4M21 22l7 4M36 12h4a4 4 0 0 1 4 4v1M36 28l4 4a4 4 0 0 0 4 0v1" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 44h44" stroke="var(--border-subtle)" strokeWidth="1.5" />
        <text x="12" y="56" fontSize="9" fill="var(--text-secondary)" fontFamily="sans-serif">parent</text>
        <text x="36" y="56" fontSize="9" fill="var(--text-muted)" fontFamily="sans-serif">child</text>
    </svg>
);

const FilterIcon = () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="4" y="8" width="20" height="48" rx="4" stroke="var(--accent-primary)" strokeWidth="2" fill="var(--bg-secondary)" />
        <rect x="8" y="16" width="12" height="4" rx="2" fill="#5865f2" opacity="0.7" />
        <rect x="8" y="24" width="12" height="4" rx="2" fill="#57f287" opacity="0.7" />
        <rect x="8" y="32" width="12" height="4" rx="2" fill="#ed4245" opacity="0.7" />
        <path d="M28 24h4M28 32h4" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 3" />
        <rect x="36" y="14" width="24" height="10" rx="3" stroke="var(--border-subtle)" strokeWidth="1.5" fill="var(--bg-secondary)" />
        <rect x="36" y="28" width="24" height="10" rx="3" stroke="var(--border-subtle)" strokeWidth="1.5" fill="var(--bg-secondary)" />
        <rect x="40" y="17" width="8" height="4" rx="2" fill="#5865f2" opacity="0.5" />
        <rect x="40" y="31" width="8" height="4" rx="2" fill="#57f287" opacity="0.5" />
        <path d="M52 17h4M52 31h4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const ContextMenuIcon = () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="12" y="8" width="40" height="48" rx="6" stroke="var(--border-subtle)" strokeWidth="2" fill="var(--bg-secondary)" />
        <rect x="18" y="16" width="28" height="8" rx="3" fill="var(--bg-hover)" stroke="var(--accent-primary)" strokeWidth="1.5" />
        <text x="22" y="22.5" fontSize="7" fill="var(--accent-primary)" fontFamily="sans-serif">수정</text>
        <rect x="18" y="28" width="28" height="8" rx="3" fill="var(--bg-hover)" />
        <text x="22" y="34.5" fontSize="7" fill="var(--text-secondary)" fontFamily="sans-serif">이름 변경</text>
        <rect x="18" y="40" width="28" height="8" rx="3" fill="var(--bg-hover)" />
        <text x="22" y="46.5" fontSize="7" fill="var(--text-secondary)" fontFamily="sans-serif">삭제</text>
        <circle cx="48" cy="12" r="8" fill="var(--accent-primary)" opacity="0.9" />
        <path d="M45 12h6M48 9v6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const ReadyIcon = () => (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="6" y="16" width="16" height="12" rx="3" stroke="var(--text-secondary)" strokeWidth="1.5" fill="var(--bg-primary)" />
        <circle cx="14" cy="20" r="2" fill="#fee75c" />
        <text x="10" y="26" fontSize="5" fill="var(--text-muted)" fontFamily="sans-serif">Light</text>
        <rect x="24" y="16" width="16" height="12" rx="3" stroke="var(--accent-primary)" strokeWidth="2" fill="var(--bg-secondary)" />
        <circle cx="32" cy="20" r="2" fill="#5865f2" />
        <text x="28" y="26" fontSize="5" fill="var(--text-secondary)" fontFamily="sans-serif">Dark</text>
        <rect x="42" y="16" width="16" height="12" rx="3" stroke="var(--text-secondary)" strokeWidth="1.5" fill="var(--bg-primary)" />
        <circle cx="50" cy="20" r="2" fill="var(--text-muted)" />
        <text x="44" y="26" fontSize="5" fill="var(--text-muted)" fontFamily="sans-serif">Auto</text>
        <circle cx="32" cy="46" r="12" stroke="var(--accent-primary)" strokeWidth="2.5" fill="none" />
        <path d="M26 46l4 4 8-8" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const ONBOARDING_SLIDES: OnboardingSlideData[] = [
    {
        icon: <VaultIcon />,
        title: 'LocalTag에 오신 것을 환영합니다',
        description:
            '📌 LocalTag는 하나의 Vault 폴더(MyTaggedFiles)에 파일을 모아두고, 태그를 붙여 깔끔하게 정리하는 앱입니다.\n 📌 폴더 구조 대신 태그로 파일을 자유롭게 분류하세요.',
    },
    {
        icon: <FileAddIcon />,
        title: '파일 추가하기',
        description:
            '📌 파일을 드래그 앤 드롭하거나, 파일 추가 버튼을 눌러 Vault에 파일을 가져올 수 있습니다.\n 📌 좌측 사이드바에서 태그를 선택한 상태라면, 추가된 파일들이 해당 태그로 분류됩니다.\n 📌 자주 다운로드하는 폴더가 있다면 우측 상단의 자동 수집 기능을 켜서 새 파일을 자동으로 가져오세요.',
    },
    {
        icon: <TagTreeIcon />,
        title: '계층형 태그로 정리',
        description:
            '📌 태그는 부모-자식 구조로 계층을 만들 수 있고, 원하는 색상을 지정할 수 있습니다.\n 📌 자주 쓰는 태그는 즐겨찾기(⭐)에 등록하면 항상 상단에 표시됩니다.',
    },
    {
        icon: <FilterIcon />,
        title: '태그로 파일 찾기',
        description:
            '📌 왼쪽 사이드바에서 태그를 클릭하면 해당 파일만 필터링됩니다(부모 태그를 필터링 시 하위 태그 모두 포함).\n 📌 여러 태그를 동시에 선택하거나, 검색창으로 빠르게 태그를 찾을 수 있습니다.\n 📌 여러 파일을 선택(CheckBox)해 태그를 일괄 편집하는 것도 가능합니다.',
    },
    {
        icon: <ContextMenuIcon />,
        title: '태그/파일 수정',
        description:
            '📌 사이드바의 태그를 우클릭하면 이름 변경, 색상 수정, 삭제 등의 메뉴가 나타납니다.\n 📌 파일 목록에서 파일을 우클릭하면 파일 열기, 태그 편집, 이름 변경, 삭제 등을 할 수 있습니다.',
    },
    {
        icon: <ReadyIcon />,
        title: '시작할 준비 완료!',
        description:
            '📌 상단의 테마 버튼으로 라이트/다크/시스템 모드를 전환할 수 있습니다.\n 📌 이 가이드는 언제든 상단의 ? 버튼을 눌러 다시 확인할 수 있습니다.',
    },
];

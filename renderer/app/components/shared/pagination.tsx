'use client';

import './pagination.css';

/**
 * Pagination - 페이지 네비게이션 컴포넌트
 *
 * @param currentPage - 현재 페이지 번호 (1부터 시작)
 * @param totalCount - 전체 아이템 개수
 * @param limit - 페이지당 아이템 개수 (기본값: 50)
 * @param onPageChange - 페이지 변경 콜백
 * @param pageGroupSize - 한 번에 표시할 페이지 개수 (기본값: 5)
 * @param className - 추가 CSS 클래스
 */

interface PaginationProps {
    currentPage: number;
    totalCount: number;
    limit?: number;
    onPageChange: (page: number) => void;
    pageGroupSize?: number;
    className?: string;
}

export default function Pagination({
    currentPage,
    totalCount,
    limit = 50,
    onPageChange,
    pageGroupSize = 5,
    className = '',
}: PaginationProps) {
    const totalPages = Math.ceil(totalCount / limit);

    if (totalPages <= 1) {
        return null;
    }

    const currentGroup = Math.ceil(currentPage / pageGroupSize);
    const startPage = (currentGroup - 1) * pageGroupSize + 1;
    const endPage = Math.min(startPage + pageGroupSize - 1, totalPages);
    const pages = Array.from(
        { length: Math.max(0, endPage - startPage + 1) },
        (_, index) => startPage + index
    );

    return (
        <div className={`pagination ${className}`}>
            {/* 첫 페이지 */}
            <button
                className="pagination__btn pagination__btn--icon"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                title="처음 페이지"
            >
                «
            </button>

            {/* 이전 페이지 그룹 */}
            <button
                className="pagination__btn pagination__btn--icon"
                onClick={() => onPageChange(Math.max(1, startPage - pageGroupSize))}
                disabled={currentGroup === 1}
                title="이전 5페이지"
            >
                ‹
            </button>

            {/* 페이지 번호 */}
            <div className="pagination__numbers">
                {pages.map((page) => (
                    <button
                        key={page}
                        className={`pagination__btn ${page === currentPage ? 'pagination__btn--active' : ''}`}
                        onClick={() => onPageChange(page)}
                    >
                        {page}
                    </button>
                ))}
            </div>

            {/* 다음 페이지 그룹 */}
            <button
                className="pagination__btn pagination__btn--icon"
                onClick={() => onPageChange(Math.min(totalPages, startPage + pageGroupSize))}
                disabled={currentGroup === Math.ceil(totalPages / pageGroupSize)}
                title="다음 5페이지"
            >
                ›
            </button>

            {/* 마지막 페이지 */}
            <button
                className="pagination__btn pagination__btn--icon"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="마지막 페이지"
            >
                »
            </button>
        </div>
    );
}

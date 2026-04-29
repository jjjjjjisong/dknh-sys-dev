type PaginationProps = {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  scrollOnChange?: boolean;
};

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  scrollOnChange = true,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pages = getVisiblePages(currentPage, totalPages);
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  function moveToPage(page: number) {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    if (nextPage === currentPage) return;
    onPageChange(nextPage);
    if (scrollOnChange) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div className="pagination">
      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-button"
          aria-label="첫 페이지"
          onClick={() => moveToPage(1)}
          disabled={currentPage === 1}
        >
          «
        </button>
        <button
          type="button"
          className="pagination-button"
          aria-label="이전 페이지"
          onClick={() => moveToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ‹
        </button>

        <div className="pagination-pages">
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              className={page === currentPage ? 'pagination-button active' : 'pagination-button'}
              onClick={() => moveToPage(page)}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="pagination-button"
          aria-label="다음 페이지"
          onClick={() => moveToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          ›
        </button>
        <button
          type="button"
          className="pagination-button"
          aria-label="마지막 페이지"
          onClick={() => moveToPage(totalPages)}
          disabled={currentPage === totalPages}
        >
          »
        </button>
      </div>

      <div className="pagination-summary">
        {rangeStart}-{rangeEnd} / 총 {totalItems.toLocaleString('ko-KR')}건
      </div>
    </div>
  );
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pageGroupSize = 5;
  const groupStart = Math.floor((currentPage - 1) / pageGroupSize) * pageGroupSize + 1;
  const groupEnd = Math.min(totalPages, groupStart + pageGroupSize - 1);

  return Array.from({ length: groupEnd - groupStart + 1 }, (_, index) => groupStart + index);
}

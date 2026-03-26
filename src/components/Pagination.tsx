type PaginationProps = {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pages = getVisiblePages(currentPage, totalPages);
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  function moveToPage(page: number) {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    if (nextPage === currentPage) return;
    onPageChange(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="pagination">
      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-button"
          onClick={() => moveToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          이전
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
          onClick={() => moveToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          다음
        </button>
      </div>

      <div className="pagination-summary">
        {rangeStart}-{rangeEnd} / 총 {totalItems.toLocaleString('ko-KR')}건
      </div>
    </div>
  );
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
}

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * ⚡ Reusable, High-Performance Pagination Bar Component
 * Used across tables, card grids, and ledger feeds throughout Capise.
 */
const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 'all'],
  itemLabel = 'items',
  className = '',
}) => {
  const isAll = pageSize === 'all';
  const effectivePageSize = isAll ? Math.max(1, totalItems) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));

  const startItem = totalItems === 0 ? 0 : isAll ? 1 : (currentPage - 1) * effectivePageSize + 1;
  const endItem = isAll ? totalItems : Math.min(currentPage * effectivePageSize, totalItems);

  // Generate visible page numbers with smart ellipsis
  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [currentPage, totalPages]);

  if (totalItems <= 0) return null;

  return (
    <div
      className={`px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 rounded-b-xl select-none ${className}`}
    >
      {/* Items range & Page size selector */}
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <>
            <span className="text-gray-500">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                onPageSizeChange(val);
              }}
              className="border-gray-300 rounded-lg py-1 px-2 text-xs bg-white font-medium text-gray-700 shadow-2xs focus:ring-indigo-500 focus:border-indigo-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All' : `${opt} / page`}
                </option>
              ))}
            </select>
            <span className="text-gray-300">|</span>
          </>
        )}

        <span>
          Showing <strong className="text-gray-900 font-semibold">{startItem}</strong> -{' '}
          <strong className="text-gray-900 font-semibold">{endItem}</strong> of{' '}
          <strong className="text-gray-900 font-semibold">{totalItems}</strong> {itemLabel}
        </span>
      </div>

      {/* Navigation Buttons */}
      {!isAll && totalPages > 1 && (
        <div className="flex items-center space-x-1.5">
          {/* First Page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4 text-gray-600" />
          </button>

          {/* Previous Page */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>

          {/* Page Pills */}
          <div className="flex items-center space-x-1">
            {visiblePages.map((p, idx) =>
              p === '...' ? (
                <span key={`dots-${idx}`} className="px-1 text-gray-400 font-bold">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded-lg transition ${
                    currentPage === p
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          {/* Next Page */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>

          {/* Last Page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className="p-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;

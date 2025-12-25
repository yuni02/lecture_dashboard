'use client';

interface SortableTableHeaderProps {
  label: string;
  sortKey: string;
  currentSortKey: string;
  sortDirection: 'asc' | 'desc';
  onSort: (key: string) => void;
  className?: string;
}

export default function SortableTableHeader({
  label,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  className = '',
}: SortableTableHeaderProps) {
  const isActive = currentSortKey === sortKey;

  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none transition-colors ${className}`}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="inline-flex flex-col text-[10px] leading-none">
          <span className={isActive && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}>
            ▲
          </span>
          <span className={isActive && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}>
            ▼
          </span>
        </span>
      </div>
    </th>
  );
}

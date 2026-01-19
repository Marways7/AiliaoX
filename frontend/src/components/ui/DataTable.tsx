/**
 * DataTable - 支持columns/data格式的表格组件
 */
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table'

interface Column<T> {
  key: string
  title: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyText?: string
  loading?: boolean
  currentPage?: number
  totalPages?: number
  totalItems?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  emptyText = '暂无数据',
  loading,
  currentPage,
  totalPages,
  onPageChange,
}: DataTableProps<T>) {
  return (
    <div>
      <Table loading={loading}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.title}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data && data.length > 0 ? (
            data.map((item) => (
              <TableRow key={item.id}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render ? column.render(item) : (item as any)[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <div className="text-center py-8 text-text-secondary">{emptyText}</div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* 分页控制 */}
      {totalPages && totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtle">
          <div className="text-sm text-text-secondary">
            当前第 {currentPage} 页，共 {totalPages} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, (currentPage || 1) - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm rounded bg-background-secondary text-text-primary border border-border-subtle hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, (currentPage || 1) + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm rounded bg-background-secondary text-text-primary border border-border-subtle hover:bg-background-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

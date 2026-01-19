/**
 * Table 表格组件 - 未来感风格
 */
import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Loading } from './Loading'

interface TableProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  loading?: boolean
}

export const Table = ({ children, loading, className, ...props }: TableProps) => {
  return (
    <div className={cn('table-container', className)} {...props}>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loading text="加载中..." />
        </div>
      ) : (
        <table className="table-neon">{children}</table>
      )}
    </div>
  )
}

/**
 * TableHeader 表头
 */
interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
}

export const TableHeader = ({ children, className, ...props }: TableHeaderProps) => {
  return (
    <thead className={cn('', className)} {...props}>
      {children}
    </thead>
  )
}

/**
 * TableBody 表格主体
 */
interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
}

export const TableBody = ({ children, className, ...props }: TableBodyProps) => {
  return (
    <tbody className={cn('', className)} {...props}>
      {children}
    </tbody>
  )
}

/**
 * TableRow 表格行
 */
interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode
  clickable?: boolean
}

export const TableRow = ({ children, clickable, className, ...props }: TableRowProps) => {
  return (
    <tr
      className={cn(clickable && 'cursor-pointer hover:bg-background-secondary/70', className)}
      {...props}
    >
      {children}
    </tr>
  )
}

/**
 * TableHead 表头单元格
 */
interface TableHeadProps extends HTMLAttributes<HTMLTableCellElement> {
  children: ReactNode
  sortable?: boolean
}

export const TableHead = ({ children, sortable, className, ...props }: TableHeadProps) => {
  return (
    <th
      className={cn(sortable && 'cursor-pointer hover:text-primary-400', className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        )}
      </div>
    </th>
  )
}

/**
 * TableCell 表格单元格
 */
interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  children: ReactNode
  colSpan?: number
  rowSpan?: number
}

export const TableCell = ({ children, className, colSpan, rowSpan, ...props }: TableCellProps) => {
  return (
    <td className={cn('', className)} colSpan={colSpan} rowSpan={rowSpan} {...props}>
      {children}
    </td>
  )
}

/**
 * EmptyState 空状态
 */
interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export const EmptyState = ({
  title = '暂无数据',
  description,
  icon,
  action,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4 text-text-tertiary">{icon}</div>}
      <h3 className="text-lg font-medium text-text-secondary">{title}</h3>
      {description && <p className="text-sm text-text-tertiary mt-1 max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

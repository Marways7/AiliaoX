/**
 * NativeSelect 原生Select组件 - 用于表单兼容
 */
import { forwardRef, SelectHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  children: ReactNode
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ label, error, helperText, fullWidth = false, className, children, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label className="text-sm font-medium text-text-secondary">
            {label}
            {props.required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          className={cn(
            // 基础样式
            'w-full px-4 py-2.5 rounded-lg',
            'bg-background-secondary border border-border-primary',
            'text-text-primary',
            'transition-all duration-300',
            // Focus状态
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'focus:shadow-neon-blue',
            // 错误状态
            error && 'border-error-500 focus:ring-error-500 focus:border-error-500',
            // Disabled状态
            'disabled:opacity-50 disabled:cursor-not-allowed',
            // 自定义样式
            className
          )}
          {...props}
        >
          {children}
        </select>

        {error && (
          <span className="text-sm text-error-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </span>
        )}

        {helperText && !error && (
          <span className="text-sm text-text-tertiary">{helperText}</span>
        )}
      </div>
    )
  }
)

NativeSelect.displayName = 'NativeSelect'

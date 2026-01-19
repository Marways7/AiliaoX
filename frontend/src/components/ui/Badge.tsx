/**
 * Badge 徽章组件 - 未来感风格
 */
import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'blue' | 'purple' | 'cyan' | 'gray' | 'default' | 'danger'
type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  children: React.ReactNode
}

const badgeVariants: Record<BadgeVariant, string> = {
  primary: 'badge-primary',
  secondary: 'bg-secondary-500/20 text-secondary-400 border border-secondary-500/30',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'bg-accent-500/20 text-accent-400 border border-accent-500/30',
  blue: 'bg-primary-500/20 text-primary-400 border border-primary-500/30',
  purple: 'bg-secondary-500/20 text-secondary-400 border border-secondary-500/30',
  cyan: 'bg-accent-500/20 text-accent-400 border border-accent-500/30',
  gray: 'bg-background-secondary text-text-tertiary border border-border-subtle',
  default: 'bg-background-secondary text-text-secondary border border-white/20',
  danger: 'badge-error', // 别名，指向error
}

const badgeSizes: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'primary', size = 'md', dot = false, className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          // 基础徽章样式
          'badge',
          // 变体样式
          badgeVariants[variant],
          // 尺寸样式
          badgeSizes[size],
          // 点状徽章
          dot && 'pl-4 relative',
          // 自定义样式
          className
        )}
        {...props}
      >
        {dot && (
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        )}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

/**
 * StatusBadge 状态徽章
 */
interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'error'
}

const statusConfig: Record<string, { variant: BadgeVariant; label: string }> = {
  active: { variant: 'success', label: '活跃' },
  inactive: { variant: 'error', label: '未激活' },
  pending: { variant: 'warning', label: '待处理' },
  completed: { variant: 'success', label: '已完成' },
  cancelled: { variant: 'error', label: '已取消' },
  error: { variant: 'error', label: '错误' },
}

export const StatusBadge = ({ status, children, ...props }: StatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.pending

  return (
    <Badge variant={config.variant} dot {...props}>
      {children || config.label}
    </Badge>
  )
}

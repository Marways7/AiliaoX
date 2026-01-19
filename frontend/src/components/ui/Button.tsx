/**
 * Button 按钮组件 - 未来感霓虹风格
 */
import { forwardRef, ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'danger' | 'ghost' | 'neon' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:shadow-neon-blue shadow-primary-500/20',
  secondary: 'bg-gradient-to-r from-secondary-600 to-secondary-500 text-white hover:shadow-neon-purple shadow-secondary-500/20',
  success: 'bg-gradient-to-r from-success-600 to-success-500 text-white hover:shadow-neon-cyan shadow-success-500/20',
  warning: 'bg-gradient-to-r from-warning-600 to-warning-500 text-white hover:shadow-neon-cyan shadow-warning-500/20',
  error: 'bg-gradient-to-r from-error-600 to-error-500 text-white hover:shadow-neon-purple shadow-error-500/20',
  danger: 'bg-gradient-to-r from-error-600 to-error-500 text-white hover:shadow-neon-purple shadow-error-500/20',
  ghost: 'bg-transparent text-text-primary border border-border-primary hover:bg-background-secondary hover:border-primary-500',
  neon: 'btn-neon',
  outline: 'bg-transparent text-text-primary border border-white/20 hover:bg-background-secondary hover:border-neon-blue/50',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
  xl: 'px-8 py-4 text-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, fullWidth = false, icon, disabled, className, children, onClick, type, ...props }, ref) => {
    const buttonClass = cn(
      // 基础样式
      'relative rounded-lg font-semibold transition-all duration-300',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-primary',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'flex items-center justify-center gap-2',
      // 变体样式
      buttonVariants[variant],
      // 尺寸样式
      buttonSizes[size],
      // 全宽样式
      fullWidth && 'w-full',
      // 自定义样式
      className
    )

    const buttonContent = loading ? (
      <>
        <span className="loading-spinner w-4 h-4 border-2" />
        <span>加载中...</span>
      </>
    ) : (
      <>
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </>
    )

    // 如果禁用或加载中，使用普通button
    if (disabled || loading) {
      return (
        <button
          ref={ref}
          type={type}
          onClick={onClick}
          disabled={disabled || loading}
          className={buttonClass}
          {...props}
        >
          {buttonContent}
        </button>
      )
    }

    // 否则使用motion.button
    return (
      <motion.button
        ref={ref}
        type={type}
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
        disabled={disabled || loading}
        className={buttonClass}
      >
        {buttonContent}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'

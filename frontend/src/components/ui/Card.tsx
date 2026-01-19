/**
 * Card 卡片组件 - 未来感玻璃态风格
 */
import { forwardRef, HTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

type CardVariant = 'default' | 'glass' | 'neon-blue' | 'neon-purple' | 'neon-cyan'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  hover?: boolean
  glow?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
}

const cardVariants: Record<CardVariant, string> = {
  default: 'card',
  glass: 'glass-strong',
  'neon-blue': 'card card-hover-blue',
  'neon-purple': 'card card-hover-purple',
  'neon-cyan': 'card card-hover-cyan',
}

const cardPadding: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', hover = false, glow = false, padding = 'md', className, children, ...props }, ref) => {
    const cardClass = cn(
      cardVariants[variant],
      cardPadding[padding],
      glow && 'shadow-neon-blue',
      className
    )

    if (hover) {
      return (
        <motion.div
          ref={ref}
          whileHover={{ y: -4, transition: { duration: 0.3 } }}
          className={cardClass}
          {...props}
        >
          {children}
        </motion.div>
      )
    }

    return (
      <div
        ref={ref}
        className={cardClass}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

/**
 * CardHeader 卡片头部
 */
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: React.ReactNode
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, description, action, className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-start justify-between mb-4', className)} {...props}>
        <div className="flex-1">
          {title && <h3 className="text-lg font-semibold text-text-primary">{title}</h3>}
          {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
          {children}
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

/**
 * CardBody 卡片内容
 */
export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('text-text-primary', className)} {...props}>
        {children}
      </div>
    )
  }
)

CardBody.displayName = 'CardBody'

/**
 * CardFooter 卡片底部
 */
export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border-subtle', className)} {...props}>
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'

/**
 * Loading 加载组件 - 未来感霓虹风格
 */
import { cn } from '@/utils/cn'

type LoadingSize = 'sm' | 'md' | 'lg' | 'xl'
type LoadingVariant = 'spinner' | 'dots' | 'pulse'

interface LoadingProps {
  size?: LoadingSize
  variant?: LoadingVariant
  text?: string
  fullScreen?: boolean
  className?: string
}

const loadingSizes: Record<LoadingSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
}

/**
 * Spinner 旋转加载
 */
const Spinner = ({ size = 'md', className }: { size?: LoadingSize; className?: string }) => {
  return (
    <div
      className={cn(
        'border-2 border-primary-500 border-t-transparent rounded-full animate-spin',
        loadingSizes[size],
        className
      )}
    />
  )
}

/**
 * Dots 点状加载
 */
const Dots = ({ size = 'md', className }: { size?: LoadingSize; className?: string }) => {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className={cn('rounded-full bg-primary-500 animate-bounce', dotSize)} style={{ animationDelay: '0s' }} />
      <div className={cn('rounded-full bg-primary-500 animate-bounce', dotSize)} style={{ animationDelay: '0.1s' }} />
      <div className={cn('rounded-full bg-primary-500 animate-bounce', dotSize)} style={{ animationDelay: '0.2s' }} />
    </div>
  )
}

/**
 * Pulse 脉冲加载
 */
const Pulse = ({ size = 'md', className }: { size?: LoadingSize; className?: string }) => {
  return (
    <div className={cn('relative', loadingSizes[size], className)}>
      <div className={cn('absolute inset-0 rounded-full bg-primary-500 animate-neon-pulse', loadingSizes[size])} />
      <div className={cn('absolute inset-0 rounded-full bg-primary-500 animate-neon-pulse', loadingSizes[size])} style={{ animationDelay: '0.5s' }} />
    </div>
  )
}

export const Loading = ({
  size = 'md',
  variant = 'spinner',
  text,
  fullScreen = false,
  className,
}: LoadingProps) => {
  const loadingComponent = {
    spinner: <Spinner size={size} />,
    dots: <Dots size={size} />,
    pulse: <Pulse size={size} />,
  }[variant]

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-primary/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          {loadingComponent}
          {text && <p className="text-text-secondary text-lg">{text}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      {loadingComponent}
      {text && <span className="text-text-secondary">{text}</span>}
    </div>
  )
}

/**
 * LoadingOverlay 加载遮罩层
 */
interface LoadingOverlayProps {
  loading: boolean
  text?: string
  children: React.ReactNode
}

export const LoadingOverlay = ({ loading, text, children }: LoadingOverlayProps) => {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background-primary/60 backdrop-blur-sm rounded-lg">
          <Loading text={text} />
        </div>
      )}
    </div>
  )
}

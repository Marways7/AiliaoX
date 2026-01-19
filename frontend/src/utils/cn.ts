import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并Tailwind CSS类名
 * 使用clsx和tailwind-merge确保类名正确合并，避免冲突
 *
 * @example
 * cn('px-4 py-2', 'bg-blue-500', { 'text-white': true })
 * // 返回: 'px-4 py-2 bg-blue-500 text-white'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

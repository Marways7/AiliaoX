/**
 * 格式化工具函数
 */
import { format as dateFnsFormat, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

/**
 * 格式化日期
 * @param date 日期字符串或Date对象
 * @param formatStr 格式字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: string | Date | null | undefined,
  formatStr: string = 'yyyy-MM-dd'
): string {
  if (!date) return '-'

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return dateFnsFormat(dateObj, formatStr, { locale: zhCN })
  } catch (error) {
    console.error('Date format error:', error)
    return '-'
  }
}

/**
 * 格式化日期时间
 * @param date 日期字符串或Date对象
 * @returns 格式化后的日期时间字符串
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'yyyy-MM-dd HH:mm:ss')
}

/**
 * 格式化短日期时间
 * @param date 日期字符串或Date对象
 * @returns 格式化后的短日期时间字符串
 */
export function formatDateTimeShort(date: string | Date | null | undefined): string {
  return formatDate(date, 'yyyy-MM-dd HH:mm')
}

/**
 * 格式化时间
 * @param date 日期字符串或Date对象
 * @returns 格式化后的时间字符串
 */
export function formatTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'HH:mm:ss')
}

/**
 * 格式化短时间
 * @param date 日期字符串或Date对象
 * @returns 格式化后的短时间字符串
 */
export function formatTimeShort(date: string | Date | null | undefined): string {
  return formatDate(date, 'HH:mm')
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param decimals 小数位数
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/**
 * 格式化数字
 * @param num 数字
 * @param decimals 小数位数
 * @returns 格式化后的数字字符串
 */
export function formatNumber(num: number | null | undefined, decimals: number = 2): string {
  if (num === null || num === undefined) return '-'

  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * 格式化货币
 * @param amount 金额
 * @param currency 货币符号
 * @returns 格式化后的货币字符串
 */
export function formatCurrency(amount: number | null | undefined, currency: string = '¥'): string {
  if (amount === null || amount === undefined) return '-'

  return `${currency}${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * 格式化百分比
 * @param value 数值（0-1）
 * @param decimals 小数位数
 * @returns 格式化后的百分比字符串
 */
export function formatPercent(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '-'

  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * 格式化手机号
 * @param phone 手机号
 * @returns 格式化后的手机号
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-'

  // 格式化为 138 8888 8888
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3')
}

/**
 * 脱敏手机号
 * @param phone 手机号
 * @returns 脱敏后的手机号
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '-'

  // 格式化为 138****8888
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * 脱敏身份证号
 * @param idCard 身份证号
 * @returns 脱敏后的身份证号
 */
export function maskIdCard(idCard: string | null | undefined): string {
  if (!idCard) return '-'

  // 格式化为 110***********0011
  return idCard.replace(/(\d{3})\d{11}(\d{4})/, '$1***********$2')
}

/**
 * 格式化年龄
 * @param birthDate 出生日期
 * @returns 年龄字符串
 */
export function formatAge(birthDate: string | Date | null | undefined): string {
  if (!birthDate) return '-'

  try {
    const birth = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate
    const now = new Date()
    const age = now.getFullYear() - birth.getFullYear()

    // 判断是否已过生日
    const m = now.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      return `${age - 1}岁`
    }

    return `${age}岁`
  } catch (error) {
    console.error('Age format error:', error)
    return '-'
  }
}

/**
 * 截断文本
 * @param text 文本
 * @param maxLength 最大长度
 * @param suffix 后缀
 * @returns 截断后的文本
 */
export function truncateText(text: string | null | undefined, maxLength: number = 50, suffix: string = '...'): string {
  if (!text) return '-'

  if (text.length <= maxLength) {
    return text
  }

  return text.substring(0, maxLength) + suffix
}

/**
 * 首字母大写
 * @param str 字符串
 * @returns 首字母大写的字符串
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * 去除HTML标签
 * @param html HTML字符串
 * @returns 纯文本
 */
export function stripHtmlTags(html: string | null | undefined): string {
  if (!html) return ''

  return html.replace(/<[^>]*>/g, '')
}

/**
 * 高亮关键词
 * @param text 文本
 * @param keyword 关键词
 * @returns 高亮后的HTML字符串
 */
export function highlightKeyword(text: string, keyword: string): string {
  if (!text || !keyword) return text

  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<mark class="bg-primary-500/30 text-primary-400">$1</mark>')
}

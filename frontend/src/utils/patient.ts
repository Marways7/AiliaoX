/**
 * 患者相关工具函数
 */
import type { Patient } from '@/@types'

/**
 * 计算患者年龄
 */
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * 获取患者年龄信息
 */
export function getPatientAge(patient: Patient): number {
  return calculateAge(patient.birthDate)
}

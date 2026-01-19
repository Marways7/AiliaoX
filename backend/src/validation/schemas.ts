/**
 * 数据验证Schema
 * 使用zod进行输入验证
 */

import { z } from 'zod';
import { Gender, AnnouncementType, AnnouncementPriority, AnnouncementStatus } from '@prisma/client';

/**
 * 患者相关验证Schema
 */
export const CreatePatientSchema = z.object({
  name: z.string().min(1, '患者姓名不能为空').max(100, '患者姓名过长'),
  gender: z.nativeEnum(Gender, {
    errorMap: () => ({ message: '性别必须是MALE、FEMALE或OTHER' })
  }),
  birthDate: z.string().refine(
    (date) => {
      const d = new Date(date);
      return !isNaN(d.getTime()) && d < new Date();
    },
    { message: '出生日期格式无效或日期不能是未来' }
  ),
  idCard: z.string().optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式无效').optional(),
  address: z.string().max(500, '地址过长').optional(),
  emergencyContact: z.string().max(100, '紧急联系人姓名过长').optional(),
  emergencyPhone: z.string().regex(/^1[3-9]\d{9}$/, '紧急联系人手机号格式无效').optional(),
  bloodType: z.enum(['A', 'B', 'AB', 'O', 'A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-']).optional(),
  allergies: z.string().max(1000, '过敏史描述过长').optional(),
  medicalHistory: z.string().max(2000, '既往病史描述过长').optional()
});

export const UpdatePatientSchema = z.object({
  name: z.string().min(1, '患者姓名不能为空').max(100, '患者姓名过长').optional(),
  gender: z.nativeEnum(Gender).optional(),
  birthDate: z.string().refine(
    (date) => {
      const d = new Date(date);
      return !isNaN(d.getTime()) && d < new Date();
    },
    { message: '出生日期格式无效或日期不能是未来' }
  ).optional(),
  idCard: z.string().optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式无效').optional(),
  address: z.string().max(500, '地址过长').optional(),
  emergencyContact: z.string().max(100, '紧急联系人姓名过长').optional(),
  emergencyPhone: z.string().regex(/^1[3-9]\d{9}$/, '紧急联系人手机号格式无效').optional(),
  bloodType: z.enum(['A', 'B', 'AB', 'O', 'A+', 'B+', 'AB+', 'O+', 'A-', 'B-', 'AB-', 'O-']).optional(),
  allergies: z.string().max(1000, '过敏史描述过长').optional(),
  medicalHistory: z.string().max(2000, '既往病史描述过长').optional()
});

export const PatientSearchSchema = z.object({
  keyword: z.string().optional(),
  gender: z.nativeEnum(Gender).optional(),
  ageMin: z.coerce.number().int().min(0).max(150).optional(),
  ageMax: z.coerce.number().int().min(0).max(150).optional(),
  bloodType: z.string().optional(),
  hasAllergies: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const AddPatientTagSchema = z.object({
  tag: z.string().min(1, '标签不能为空').max(50, '标签过长'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '颜色格式无效，应为#RRGGBB').optional()
});

/**
 * AI辅助相关验证Schema
 */
export const DiagnoseSchema = z.object({
  symptoms: z.array(z.string()).min(1, '至少提供一个症状'),
  patientHistory: z.string().max(2000, '病史描述过长').optional(),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.string().optional(),
  duration: z.string().max(200, '症状持续时间描述过长').optional()
});

export const PatientAnalysisSchema = z.object({
  patientId: z.string().uuid('患者ID格式无效'),
  analysisType: z.enum(['health_risk', 'medication_review', 'treatment_effectiveness', 'comprehensive'])
});

export const QuickRecordSchema = z.object({
  chiefComplaint: z.string().min(1, '主诉不能为空').max(500, '主诉过长'),
  symptoms: z.string().min(1, '症状描述不能为空').max(2000, '症状描述过长'),
  patientAge: z.number().int().min(0).max(150).optional(),
  patientGender: z.string().optional()
});

export const MedicalQASchema = z.object({
  question: z.string().min(1, '问题不能为空').max(1000, '问题过长'),
  context: z.string().max(2000, '背景信息过长').optional(),
  professionalLevel: z.enum(['doctor', 'patient']).default('doctor')
});

/**
 * 挂号相关验证Schema
 */
export const CreateAppointmentSchema = z.object({
  patientId: z.string().uuid('患者ID格式无效'),
  doctorId: z.string().uuid('医生ID格式无效'),
  departmentId: z.string().uuid('科室ID格式无效'),
  appointmentDate: z.string().refine(
    (date) => {
      const d = new Date(date);
      const today = new Date();
      // 将两个日期的时间部分都设置为00:00:00，只比较日期
      today.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      return !isNaN(d.getTime()) && d >= today;
    },
    { message: '挂号日期格式无效或不能是过去时间' }
  ),
  timeSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING'], {
    errorMap: () => ({ message: '时间段必须是MORNING、AFTERNOON或EVENING' })
  }),
  symptoms: z.string().max(1000, '症状描述过长').optional(),
  notes: z.string().max(1000, '备注信息过长').optional(),
  priority: z.enum(['NORMAL', 'URGENT', 'EMERGENCY']).optional()
});

export const UpdateAppointmentSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
  actualVisitTime: z.string().optional(),
  notes: z.string().max(1000, '备注信息过长').optional()
});

export const AppointmentSearchSchema = z.object({
  patientId: z.string().uuid('患者ID格式无效').optional(),
  doctorId: z.string().uuid('医生ID格式无效').optional(),
  departmentId: z.string().uuid('科室ID格式无效').optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  priority: z.enum(['NORMAL', 'URGENT', 'EMERGENCY']).optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => parseInt(val) || 20).optional(),
  sortBy: z.enum(['appointmentDate', 'createdAt', 'appointmentNo']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

/**
 * 排队相关验证Schema
 */
export const CreateQueueSchema = z.object({
  appointmentId: z.string().uuid('挂号ID格式无效')
});

/**
 * 系统公告相关验证Schema
 */
export const CreateAnnouncementSchema = z.object({
  title: z.string().min(2, '公告标题至少2个字符').max(200, '公告标题最多200个字符'),
  content: z.string().min(10, '公告内容至少10个字符').max(10000, '公告内容最多10000个字符'),
  type: z.nativeEnum(AnnouncementType, {
    errorMap: () => ({ message: '公告类型必须是SYSTEM、IMPORTANT或GENERAL' })
  }),
  priority: z.nativeEnum(AnnouncementPriority, {
    errorMap: () => ({ message: '优先级必须是LOW、MEDIUM或HIGH' })
  }),
  targetAudience: z.string().max(255, '目标受众描述过长').optional(),
  departmentId: z.string().uuid('科室ID格式无效').optional(),
  publishedAt: z.string().refine(
    (date) => {
      if (!date) return true;
      const d = new Date(date);
      return !isNaN(d.getTime());
    },
    { message: '发布时间格式无效' }
  ).optional(),
  expiresAt: z.string().refine(
    (date) => {
      if (!date) return true;
      const d = new Date(date);
      return !isNaN(d.getTime());
    },
    { message: '过期时间格式无效' }
  ).optional()
}).refine(
  (data) => {
    if (data.publishedAt && data.expiresAt) {
      const published = new Date(data.publishedAt);
      const expires = new Date(data.expiresAt);
      return expires > published;
    }
    return true;
  },
  { message: '过期时间必须晚于发布时间', path: ['expiresAt'] }
);

export const UpdateAnnouncementSchema = z.object({
  title: z.string().min(2, '公告标题至少2个字符').max(200, '公告标题最多200个字符').optional(),
  content: z.string().min(10, '公告内容至少10个字符').max(10000, '公告内容最多10000个字符').optional(),
  type: z.nativeEnum(AnnouncementType).optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),
  targetAudience: z.string().max(255, '目标受众描述过长').optional(),
  departmentId: z.string().uuid('科室ID格式无效').optional(),
  expiresAt: z.string().refine(
    (date) => {
      if (!date) return true;
      const d = new Date(date);
      return !isNaN(d.getTime());
    },
    { message: '过期时间格式无效' }
  ).optional()
});

export const AnnouncementSearchSchema = z.object({
  status: z.nativeEnum(AnnouncementStatus).optional(),
  type: z.nativeEnum(AnnouncementType).optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),
  departmentId: z.string().uuid('科室ID格式无效').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// 导出类型
export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;
export type PatientSearchInput = z.infer<typeof PatientSearchSchema>;
export type AddPatientTagInput = z.infer<typeof AddPatientTagSchema>;
export type DiagnoseInput = z.infer<typeof DiagnoseSchema>;
export type PatientAnalysisInput = z.infer<typeof PatientAnalysisSchema>;
export type QuickRecordInput = z.infer<typeof QuickRecordSchema>;
export type MedicalQAInput = z.infer<typeof MedicalQASchema>;
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
export type AppointmentSearchInput = z.infer<typeof AppointmentSearchSchema>;
export type CreateQueueInput = z.infer<typeof CreateQueueSchema>;
export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof UpdateAnnouncementSchema>;
export type AnnouncementSearchInput = z.infer<typeof AnnouncementSearchSchema>;
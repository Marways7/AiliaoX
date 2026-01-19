import { PrismaClient, AppointmentStatus, TimeSlot, Priority } from '@prisma/client';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();

async function createTestAppointments() {
  try {
    logger.info('开始创建测试挂号数据...');
    
    const doctors = await prisma.doctor.findMany({ take: 2 });
    const patients = await prisma.patient.findMany({ take: 2 });
    const depts = await prisma.department.findMany({ take: 3 });
    
    logger.info(`找到 ${doctors.length} 个医生, ${patients.length} 个患者, ${depts.length} 个科室`);
    
    if (!doctors.length || !patients.length || !depts.length) {
      logger.error('缺少必要数据，请先运行seed脚本');
      return;
    }
    
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const appointments = [
      {
        appointmentNo: 'DEP00120251001000001',
        patientId: patients[0].id,
        doctorId: doctors[0].id,
        departmentId: depts[0].id,
        appointmentDate: today,
        timeSlot: TimeSlot.MORNING,
        status: AppointmentStatus.PENDING,
        queueNumber: 1,
        priority: Priority.NORMAL,
        symptoms: '头痛、发热'
      },
      {
        appointmentNo: 'DEP00120251001000002',
        patientId: patients[1].id,
        doctorId: doctors[0].id,
        departmentId: depts[0].id,
        appointmentDate: today,
        timeSlot: TimeSlot.AFTERNOON,
        status: AppointmentStatus.COMPLETED,
        queueNumber: 2,
        priority: Priority.URGENT,
        symptoms: '胸痛、呼吸困难'
      },
      {
        appointmentNo: 'DEP00220250930000001',
        patientId: patients[0].id,
        doctorId: doctors[1].id,
        departmentId: depts[1].id,
        appointmentDate: yesterday,
        timeSlot: TimeSlot.MORNING,
        status: AppointmentStatus.COMPLETED,
        queueNumber: 1,
        priority: Priority.NORMAL,
        symptoms: '腹痛'
      },
      {
        appointmentNo: 'DEP00120251001000003',
        patientId: patients[1].id,
        doctorId: doctors[0].id,
        departmentId: depts[0].id,
        appointmentDate: today,
        timeSlot: TimeSlot.EVENING,
        status: AppointmentStatus.CANCELLED,
        queueNumber: 3,
        priority: Priority.NORMAL,
        symptoms: '咳嗽',
        cancelReason: '时间冲突'
      },
      {
        appointmentNo: 'DEP00320251001000001',
        patientId: patients[0].id,
        doctorId: doctors[0].id,
        departmentId: depts[2].id,
        appointmentDate: today,
        timeSlot: TimeSlot.AFTERNOON,
        status: AppointmentStatus.PENDING,
        queueNumber: 4,
        priority: Priority.EMERGENCY,
        symptoms: '高烧不退'
      }
    ];
    
    for (const apt of appointments) {
      try {
        await prisma.appointment.create({ data: apt });
        logger.info(`创建挂号: ${apt.appointmentNo}`);
      } catch (error: any) {
        logger.error(`创建挂号失败 ${apt.appointmentNo}: ${error.message}`);
      }
    }
    
    const count = await prisma.appointment.count();
    logger.info(`数据库中共有 ${count} 条挂号记录`);
    
  } catch (error) {
    logger.error('创建挂号数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAppointments();

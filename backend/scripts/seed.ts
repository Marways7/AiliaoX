import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { PasswordManager } from '../src/auth/password.manager';
import { logger } from '../src/utils/logger';

const prisma = new PrismaClient();
const passwordManager = new PasswordManager();

/**
 * 初始化种子数据
 */
async function seed() {
  logger.info('开始创建种子数据...');

  try {
    // 创建科室
    const departments = await Promise.all([
      prisma.department.upsert({
        where: { name: '内科' },
        update: {},
        create: {
          departmentNo: 'DEP001',
          name: '内科',
          description: '负责内科疾病诊疗',
          location: '门诊楼2楼',
          phone: '010-12345678'
        }
      }),
      prisma.department.upsert({
        where: { name: '外科' },
        update: {},
        create: {
          departmentNo: 'DEP002',
          name: '外科',
          description: '负责外科手术及诊疗',
          location: '门诊楼3楼',
          phone: '010-12345679'
        }
      }),
      prisma.department.upsert({
        where: { name: '儿科' },
        update: {},
        create: {
          departmentNo: 'DEP003',
          name: '儿科',
          description: '负责儿童疾病诊疗',
          location: '门诊楼1楼',
          phone: '010-12345680'
        }
      })
    ]);

    logger.info(`创建了 ${departments.length} 个科室`);

    // 创建管理员用户
    const adminPassword = await passwordManager.hashPassword('Admin123!');
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        passwordHash: adminPassword,
        email: 'admin@ailiaox.com',
        phone: '13800000001',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE
      }
    });
    logger.info(`创建管理员用户: ${adminUser.username}`);

    // 创建医生用户
    const doctorPassword = await passwordManager.hashPassword('Doctor123!');

    // 创建医生1 - 内科
    const doctor1User = await prisma.user.upsert({
      where: { username: 'zhangsan' },
      update: {},
      create: {
        username: 'zhangsan',
        passwordHash: doctorPassword,
        email: 'zhangsan@ailiaox.com',
        phone: '13800000002',
        role: UserRole.DOCTOR,
        status: UserStatus.ACTIVE
      }
    });

    await prisma.doctor.upsert({
      where: { userId: doctor1User.id },
      update: {},
      create: {
        userId: doctor1User.id,
        doctorNo: 'DOC001',
        name: '张三',
        departmentId: departments[0].id, // 内科
        title: '主任医师',
        specialization: '心血管疾病、高血压、糖尿病',
        qualification: '医学博士，20年临床经验',
        yearsOfExperience: 20,
        consultationFee: 100.00
      }
    });
    logger.info(`创建医生用户: ${doctor1User.username} (内科)`);

    // 创建医生2 - 外科
    const doctor2User = await prisma.user.upsert({
      where: { username: 'lisi' },
      update: {},
      create: {
        username: 'lisi',
        passwordHash: doctorPassword,
        email: 'lisi@ailiaox.com',
        phone: '13800000003',
        role: UserRole.DOCTOR,
        status: UserStatus.ACTIVE
      }
    });

    await prisma.doctor.upsert({
      where: { userId: doctor2User.id },
      update: {},
      create: {
        userId: doctor2User.id,
        doctorNo: 'DOC002',
        name: '李四',
        departmentId: departments[1].id, // 外科
        title: '副主任医师',
        specialization: '普外科、微创手术',
        qualification: '医学硕士，15年临床经验',
        yearsOfExperience: 15,
        consultationFee: 80.00
      }
    });
    logger.info(`创建医生用户: ${doctor2User.username} (外科)`);

    // 创建操作员用户
    const operatorPassword = await passwordManager.hashPassword('Operator123!');
    const operatorUser = await prisma.user.upsert({
      where: { username: 'wangwu' },
      update: {},
      create: {
        username: 'wangwu',
        passwordHash: operatorPassword,
        email: 'wangwu@ailiaox.com',
        phone: '13800000004',
        role: UserRole.OPERATOR,
        status: UserStatus.ACTIVE
      }
    });

    await prisma.operator.upsert({
      where: { userId: operatorUser.id },
      update: {},
      create: {
        userId: operatorUser.id,
        operatorNo: 'OPR001',
        name: '王五',
        department: '挂号处'
      }
    });
    logger.info(`创建操作员用户: ${operatorUser.username}`);

    // 创建一些患者数据
    const patients = await Promise.all([
      prisma.patient.upsert({
        where: { patientNo: 'PAT001' },
        update: {},
        create: {
          patientNo: 'PAT001',
          name: '赵六',
          gender: 'MALE',
          birthDate: new Date('1990-05-15'),
          idCard: 'encrypted_110101199005150001', // 实际应用中应加密
          phone: 'encrypted_13900000001', // 实际应用中应加密
          address: '北京市朝阳区xxx街道xxx号',
          bloodType: 'A',
          allergies: '青霉素过敏',
          medicalHistory: '高血压病史5年'
        }
      }),
      prisma.patient.upsert({
        where: { patientNo: 'PAT002' },
        update: {},
        create: {
          patientNo: 'PAT002',
          name: '钱七',
          gender: 'FEMALE',
          birthDate: new Date('1985-08-20'),
          idCard: 'encrypted_110101198508200002',
          phone: 'encrypted_13900000002',
          address: '北京市海淀区xxx街道xxx号',
          bloodType: 'B',
          allergies: '无',
          medicalHistory: '糖尿病史3年'
        }
      })
    ]);
    logger.info(`创建了 ${patients.length} 个患者记录`);

    // 创建药品分类
    const medicineCategories = await Promise.all([
      prisma.medicineCategory.upsert({
        where: { name: '西药' },
        update: {},
        create: {
          name: '西药',
          description: '西医药物，包括化学合成药物和生物制剂'
        }
      }),
      prisma.medicineCategory.upsert({
        where: { name: '中药' },
        update: {},
        create: {
          name: '中药',
          description: '传统中医药材，包括植物、动物和矿物药'
        }
      }),
      prisma.medicineCategory.upsert({
        where: { name: '中成药' },
        update: {},
        create: {
          name: '中成药',
          description: '经过加工制成的中药制剂'
        }
      }),
      prisma.medicineCategory.upsert({
        where: { name: '生物制品' },
        update: {},
        create: {
          name: '生物制品',
          description: '利用生物技术制造的药品，如单克隆抗体等'
        }
      }),
      prisma.medicineCategory.upsert({
        where: { name: '疫苗' },
        update: {},
        create: {
          name: '疫苗',
          description: '用于预防传染病的生物制品'
        }
      }),
      prisma.medicineCategory.upsert({
        where: { name: '诊断用药' },
        update: {},
        create: {
          name: '诊断用药',
          description: '用于疾病诊断的药物和试剂'
        }
      }),
      prisma.medicineCategory.upsert({
        where: { name: '其他' },
        update: {},
        create: {
          name: '其他',
          description: '其他类型的药品'
        }
      })
    ]);
    logger.info(`创建了 ${medicineCategories.length} 个药品分类`);

    logger.info('种子数据创建完成！');
    logger.info('');
    logger.info('测试账号信息：');
    logger.info('=====================================');
    logger.info('管理员 - 用户名: admin, 密码: Admin123!');
    logger.info('医生1 - 用户名: zhangsan, 密码: Doctor123!');
    logger.info('医生2 - 用户名: lisi, 密码: Doctor123!');
    logger.info('操作员 - 用户名: wangwu, 密码: Operator123!');
    logger.info('=====================================');

  } catch (error) {
    logger.error('创建种子数据失败:', error);
    throw error;
  }
}

// 执行种子数据创建
seed()
  .then(() => {
    logger.info('数据库初始化成功');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('数据库初始化失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
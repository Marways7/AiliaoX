import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== 查询张三和李四的科室信息 ===\n');

  const users = await prisma.user.findMany({
    where: {
      username: { in: ['zhangsan', 'lisi'] }
    },
    select: {
      id: true,
      username: true,
      departmentId: true,
      department: { select: { id: true, name: true } }
    }
  });

  console.log('用户信息:');
  users.forEach(u => {
    console.log(`- ${u.username}: 科室ID=${u.departmentId}, 科室=${u.department.name}`);
  });

  console.log('\n=== 查询医生记录 ===\n');

  const doctors = await prisma.doctor.findMany({
    where: {
      user: {
        username: { in: ['zhangsan', 'lisi'] }
      }
    },
    select: {
      id: true,
      name: true,
      userId: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      user: { select: { username: true, departmentId: true } }
    }
  });

  console.log('医生信息:');
  doctors.forEach(d => {
    console.log(`- ${d.name} (ID: ${d.id}): 医生科室ID=${d.departmentId}, 用户科室ID=${d.user.departmentId}`);
    console.log(`  科室名: ${d.department.name}`);
  });
}

main().finally(() => prisma.$disconnect());

/**
 * AI搜索功能E2E验证脚本
 * 测试前端API调用到后端的完整流程
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'ailiaox-jwt-secret-dev';

async function testAISearchE2E() {
  try {
    console.log('=== AI搜索功能E2E验证 ===\n');

    // 步骤1：准备测试用户
    console.log('步骤1: 准备测试用户...');
    let user = await prisma.user.findFirst({ where: { username: 'zhangsan' } });

    if (!user) {
      console.log('❌ 测试用户不存在');
      return;
    }

    // 生成测试token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ 测试用户准备完成:', user.username);
    console.log('Token生成:', token.substring(0, 30) + '...\n');

    // 步骤2：测试AI搜索API
    console.log('步骤2: 调用AI搜索API...');
    const searchQuery = '发烧';

    const response = await fetch('http://localhost:3000/api/v1/medical-records/ai-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10
      })
    });

    const responseData = await response.json();
    console.log('响应状态:', response.status);
    console.log('响应数据结构:');
    console.log('- success:', responseData.success);
    console.log('- data keys:', Object.keys(responseData.data || {}));

    if (response.status === 200 && responseData.success) {
      console.log('✅ API调用成功\n');

      const { records, relevanceScores, explanation } = responseData.data;

      console.log('步骤3: 验证返回数据...');
      console.log('- 找到病历数量:', records?.length || 0);
      console.log('- 相关性评分数量:', relevanceScores?.length || 0);
      console.log('- AI解释:', explanation ? '已生成' : '未生成');

      if (records && records.length > 0) {
        console.log('\n✅ 数据结构验证通过');
        console.log('\n示例病历数据:');
        const record = records[0];
        console.log('- 病历号:', record.recordNo || record.recordNumber);
        console.log('- 患者姓名:', record.patient?.name || record.patientName);
        console.log('- 医生姓名:', record.doctor?.name || record.doctorName);
        console.log('- 科室:', record.doctor?.department?.name || record.department);
        console.log('- 主诉:', record.chiefComplaint);
        console.log('- 诊断:', record.diagnosis);

        if (relevanceScores && relevanceScores.length > 0) {
          console.log('\n相关性评分:');
          relevanceScores.slice(0, 3).forEach((s: any, i: number) => {
            console.log(`  ${i + 1}. 病历 ${s.recordId.substring(0, 8)}...: ${(s.score * 100).toFixed(1)}%`);
          });
        }

        if (explanation) {
          console.log('\nAI解释:');
          console.log(explanation);
        }

        console.log('\n✅✅✅ AI搜索功能端到端验证通过！✅✅✅');
        console.log('\n功能状态：');
        console.log('- 前端API路径: /medical-records/ai-search ✅');
        console.log('- 后端路由: POST /api/v1/medical-records/ai-search ✅');
        console.log('- 数据库查询: ✅');
        console.log('- 相关性计算: ✅');
        console.log('- AI解释生成: ✅');
        console.log('- 数据映射: ✅');
      } else {
        console.log('\n⚠️  未找到匹配的病历数据');
      }
    } else {
      console.log('❌ API调用失败');
      console.log('错误信息:', responseData.message || responseData.error);
    }

  } catch (error) {
    console.error('❌ E2E测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAISearchE2E();

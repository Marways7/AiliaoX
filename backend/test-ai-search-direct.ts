/**
 * AI搜索功能直接测试（不需要认证）
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAISearchDirect() {
  try {
    console.log('Testing AI Search directly from database...\n');

    // 模拟AI搜索逻辑
    const query = '发烧';
    const searchKeywords = query.toLowerCase();

    const where: any = {
      OR: [
        { chiefComplaint: { contains: searchKeywords } },
        { presentIllness: { contains: searchKeywords } },
        { diagnosis: { contains: searchKeywords } },
        { treatmentPlan: { contains: searchKeywords } },
        { aiSummary: { contains: searchKeywords } },
        { aiDiagnosticAdvice: { contains: searchKeywords } }
      ]
    };

    const records = await prisma.medicalRecord.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            patientNo: true,
            name: true,
            gender: true,
            birthDate: true
          }
        },
        doctor: {
          select: {
            id: true,
            doctorNo: true,
            name: true,
            title: true,
            department: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`✅ Found ${records.length} records matching "${query}"\n`);

    if (records.length > 0) {
      console.log('Sample record:');
      const record = records[0];
      console.log('- Record No:', record.recordNo);
      console.log('- Patient:', record.patient?.name);
      console.log('- Doctor:', record.doctor?.name);
      console.log('- Department:', record.doctor?.department?.name);
      console.log('- Chief Complaint:', record.chiefComplaint);
      console.log('- Diagnosis:', record.diagnosis);
      console.log('- Created At:', record.createdAt);

      // 计算相关性评分
      const relevanceScores = records.map(r => {
        let score = 0;
        const fields = [
          r.chiefComplaint,
          r.presentIllness,
          r.diagnosis,
          r.treatmentPlan,
          r.aiSummary,
          r.aiDiagnosticAdvice
        ];

        fields.forEach(field => {
          if (field && field.toLowerCase().includes(searchKeywords)) {
            score += 1;
          }
        });

        return {
          recordId: r.id,
          score: score / fields.length
        };
      });

      console.log('\n✅ Relevance scores calculated for', relevanceScores.length, 'records');
      console.log('Sample scores:', relevanceScores.slice(0, 3));
    } else {
      console.log('⚠️  No records found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAISearchDirect();

/**
 * AI智能辅助服务
 *
 * 功能：
 * - 智能问诊辅助（症状分析、疾病建议）
 * - 患者数据智能分析
 * - 病历快速录入辅助
 * - 医疗知识问答
 */

import { AIProviderManager } from '../ai/ai-provider-manager';
import { MessageRole } from '../ai/types';
import { logger } from '../utils/logger';
import { PatientService } from './patient.service';
import { PrismaClient } from '@prisma/client';

export interface DiagnoseRequest {
  symptoms: string[];
  patientHistory?: string;
  age?: number;
  gender?: string;
  duration?: string;
}

export interface DiagnoseResponse {
  possibleDiseases: Array<{
    name: string;
    probability: string;
    reasoning: string;
  }>;
  recommendedTests: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  suggestions: string;
  disclaimer: string;
}

export interface PatientAnalysisRequest {
  patientId: string;
  analysisType: 'health_risk' | 'medication_review' | 'treatment_effectiveness' | 'comprehensive';
}

export interface QuickRecordRequest {
  chiefComplaint: string;
  symptoms: string;
  patientAge?: number;
  patientGender?: string;
}

export interface QuickRecordResponse {
  structuredRecord: {
    chiefComplaint: string;
    presentIllness: string;
    suggestedDiagnosis: string;
    recommendedExams: string[];
    treatmentSuggestions: string;
  };
}

export interface MedicalQARequest {
  question: string;
  context?: string;
  professionalLevel?: 'doctor' | 'patient';
}

/**
 * AI智能辅助服务类
 */
export class AIAssistantService {
  private aiManager: AIProviderManager;
  private patientService: PatientService;

  constructor(aiManager: AIProviderManager, prisma: PrismaClient) {
    this.aiManager = aiManager;
    this.patientService = new PatientService(prisma);
  }

  /**
   * 智能问诊辅助
   * 基于症状分析可能的疾病并提供建议
   */
  async diagnose(request: DiagnoseRequest): Promise<DiagnoseResponse> {
    try {
      const { symptoms, patientHistory, age, gender, duration } = request;

      // 构建Prompt
      const prompt = `你是一位经验丰富的临床医生助手。请根据以下信息进行初步诊断分析：

症状：${symptoms.join(', ')}
${patientHistory ? `病史：${patientHistory}` : ''}
${age ? `年龄：${age}岁` : ''}
${gender ? `性别：${gender}` : ''}
${duration ? `症状持续时间：${duration}` : ''}

请按以下JSON格式提供分析：
{
  "possibleDiseases": [
    {
      "name": "疾病名称",
      "probability": "可能性（高/中/低）",
      "reasoning": "诊断依据"
    }
  ],
  "recommendedTests": ["建议检查项目"],
  "urgencyLevel": "紧急程度（low/medium/high/emergency）",
  "suggestions": "医生建议"
}

注意：
1. 提供3-5个最可能的疾病
2. 按可能性从高到低排序
3. 建议具体的检查项目
4. 评估是否需要紧急处理
5. 保持专业和谨慎`;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位专业的医疗AI助手，具备丰富的临床诊断经验。你的回答应该专业、准确、谨慎，并强调这只是辅助诊断，最终诊断需要医生确认。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 2000,
        temperature: 0.7
      });

      // 解析AI响应
      const aiContent = response.message?.content || '';

      // 尝试解析JSON
      let diagnoseResult: any;
      try {
        // 提取JSON部分
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          diagnoseResult = JSON.parse(jsonMatch[0]);
        } else {
          // 如果没有JSON，生成默认结构
          diagnoseResult = this.parseNonJsonDiagnoseResponse(aiContent);
        }
      } catch (parseError) {
        logger.warn('解析AI响应为JSON失败，使用文本解析:', parseError);
        diagnoseResult = this.parseNonJsonDiagnoseResponse(aiContent);
      }

      return {
        ...diagnoseResult,
        disclaimer: '⚠️ 以上分析仅供参考，不能替代专业医生的诊断。请及时就医，由专业医生进行详细检查和确诊。'
      };
    } catch (error) {
      logger.error('智能问诊失败:', error);
      throw new Error('智能问诊服务暂时不可用');
    }
  }

  /**
   * 解析非JSON格式的AI响应
   */
  private parseNonJsonDiagnoseResponse(content: string): any {
    return {
      possibleDiseases: [
        {
          name: '需要进一步检查',
          probability: '未确定',
          reasoning: content.slice(0, 200)
        }
      ],
      recommendedTests: ['建议进行全面体检', '完善相关检查'],
      urgencyLevel: 'medium',
      suggestions: content
    };
  }

  /**
   * 患者数据智能分析
   */
  async analyzePatient(request: PatientAnalysisRequest): Promise<any> {
    try {
      const { patientId, analysisType } = request;

      // 获取患者完整信息
      const patient = await this.patientService.getPatientById(patientId);
      if (!patient) {
        throw new Error('患者不存在');
      }

      // 获取病历和处方记录
      const medicalRecords = await this.patientService.getPatientMedicalRecords(patientId, 10);
      const statistics = await this.patientService.getPatientStatistics(patientId);

      // 构建分析Prompt
      let prompt = '';
      switch (analysisType) {
        case 'health_risk':
          prompt = `请分析以下患者的健康风险：

患者信息：
- 姓名：${patient.name}
- 年龄：${this.calculateAge(new Date(patient.birthDate))}岁
- 性别：${patient.gender}
- 血型：${patient.bloodType || '未知'}
- 过敏史：${patient.allergies || '无'}
- 既往病史：${patient.medicalHistory || '无'}

就诊记录：${medicalRecords.length}次
处方记录：${statistics.statistics.totalPrescriptions}次

请评估：
1. 主要健康风险因素
2. 需要关注的疾病倾向
3. 预防建议
4. 随访计划建议`;
          break;

        case 'medication_review':
          prompt = `请分析患者的用药情况：

患者信息：
- 年龄：${this.calculateAge(new Date(patient.birthDate))}岁
- 性别：${patient.gender}
- 过敏史：${patient.allergies || '无'}

处方记录数：${statistics.statistics.totalPrescriptions}

请评估：
1. 用药合理性
2. 潜在药物相互作用
3. 用药建议
4. 需要调整的用药`;
          break;

        case 'treatment_effectiveness':
          prompt = `请分析患者的治疗效果：

患者信息：
- 就诊次数：${medicalRecords.length}
- 处方次数：${statistics.statistics.totalPrescriptions}

请评估：
1. 治疗依从性
2. 症状改善情况
3. 治疗方案调整建议`;
          break;

        case 'comprehensive':
          prompt = `请对患者进行全面健康分析：

患者基本信息：
- 姓名：${patient.name}
- 年龄：${this.calculateAge(new Date(patient.birthDate))}岁
- 性别：${patient.gender}
- 血型：${patient.bloodType || '未知'}
- 过敏史：${patient.allergies || '无'}
- 既往病史：${patient.medicalHistory || '无'}

医疗记录：
- 就诊次数：${medicalRecords.length}
- 病历数：${statistics.statistics.totalMedicalRecords}
- 处方数：${statistics.statistics.totalPrescriptions}

请提供：
1. 健康状况总体评估
2. 主要健康风险
3. 治疗建议
4. 生活方式建议
5. 随访计划`;
          break;
      }

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位专业的医疗数据分析专家，擅长从患者数据中发现健康风险和治疗机会。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 2000,
        temperature: 0.7
      });

      const analysis = response.message?.content || '分析失败';

      return {
        patientId,
        analysisType,
        analysis,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('患者数据分析失败:', error);
      throw new Error('患者数据分析服务暂时不可用');
    }
  }

  /**
   * 病历快速录入辅助
   * 根据主诉和症状生成结构化病历
   */
  async quickRecord(request: QuickRecordRequest): Promise<QuickRecordResponse> {
    try {
      const { chiefComplaint, symptoms, patientAge, patientGender } = request;

      const prompt = `你是一位专业的医疗文书助手。请根据以下信息生成结构化的病历记录：

主诉：${chiefComplaint}
症状描述：${symptoms}
${patientAge ? `患者年龄：${patientAge}岁` : ''}
${patientGender ? `患者性别：${patientGender}` : ''}

请按以下JSON格式生成病历：
{
  "chiefComplaint": "精炼的主诉",
  "presentIllness": "现病史（详细描述症状的发生、发展、伴随症状、诱因、加重缓解因素等）",
  "suggestedDiagnosis": "初步诊断建议",
  "recommendedExams": ["建议检查项目"],
  "treatmentSuggestions": "治疗方案建议"
}

要求：
1. 主诉简明扼要
2. 现病史详细完整
3. 诊断建议合理
4. 检查项目针对性强
5. 治疗建议符合规范`;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位经验丰富的临床医生，擅长撰写规范的医疗病历。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 1500,
        temperature: 0.6
      });

      const aiContent = response.message?.content || '';

      // 解析JSON
      let recordResult: any;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          recordResult = JSON.parse(jsonMatch[0]);
        } else {
          // 默认结构
          recordResult = {
            chiefComplaint,
            presentIllness: symptoms,
            suggestedDiagnosis: '待完善',
            recommendedExams: [],
            treatmentSuggestions: aiContent
          };
        }
      } catch (parseError) {
        recordResult = {
          chiefComplaint,
          presentIllness: symptoms,
          suggestedDiagnosis: '待完善',
          recommendedExams: [],
          treatmentSuggestions: aiContent
        };
      }

      return {
        structuredRecord: recordResult
      };
    } catch (error) {
      logger.error('病历快速录入失败:', error);
      throw new Error('病历录入辅助服务暂时不可用');
    }
  }

  /**
   * 医疗知识问答
   */
  async medicalQA(request: MedicalQARequest): Promise<string> {
    try {
      const { question, context, professionalLevel = 'doctor' } = request;

      let systemPrompt = '';
      if (professionalLevel === 'doctor') {
        systemPrompt = '你是一位资深的临床医学专家，拥有丰富的临床经验和扎实的医学理论基础。请用专业的医学术语回答问题，并引用相关的医学文献或指南。';
      } else {
        systemPrompt = '你是一位友好的医疗科普专家，擅长用通俗易懂的语言解释医学知识。请避免使用复杂的医学术语，用患者能理解的方式回答问题。';
      }

      const userPrompt = context
        ? `背景信息：${context}\n\n问题：${question}`
        : question;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: systemPrompt
          },
          {
            role: MessageRole.USER,
            content: userPrompt
          }
        ],
        maxTokens: 1500,
        temperature: 0.7
      });

      const answer = response.message?.content || '抱歉，暂时无法回答该问题。';

      logger.info(`医疗知识问答完成 - 问题: ${question.slice(0, 50)}...`);
      return answer;
    } catch (error) {
      logger.error('医疗知识问答失败:', error);
      throw new Error('知识问答服务暂时不可用');
    }
  }

  /**
   * 获取患者治疗建议
   */
  async getPatientTreatmentSuggestions(patientId: string): Promise<string> {
    try {
      // 获取患者信息和病历
      const patient = await this.patientService.getPatientById(patientId);
      if (!patient) {
        throw new Error('患者不存在');
      }

      const medicalRecords = await this.patientService.getPatientMedicalRecords(patientId, 5);

      // 构建Prompt
      const prompt = `基于以下患者信息和最近就诊记录，请提供治疗建议：

患者信息：
- 年龄：${this.calculateAge(new Date(patient.birthDate))}岁
- 性别：${patient.gender}
- 过敏史：${patient.allergies || '无'}
- 既往病史：${patient.medicalHistory || '无'}

最近就诊记录数：${medicalRecords.length}

请提供：
1. 当前健康状况评估
2. 需要关注的健康问题
3. 治疗方案建议
4. 预防保健建议
5. 随访计划`;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位经验丰富的临床医生，擅长制定个性化的治疗方案。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 1500,
        temperature: 0.7
      });

      const suggestions = response.message?.content || '暂无建议';

      return suggestions;
    } catch (error) {
      logger.error('获取治疗建议失败:', error);
      throw new Error('治疗建议服务暂时不可用');
    }
  }

  /**
   * 计算年龄（辅助方法）
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * AI药物相互作用检查
   * 分析多种药物组合的相互作用风险
   */
  async checkDrugInteraction(medicines: Array<{ name: string; dosage: string }>) {
    try {
      const medicineList = medicines.map(m => `${m.name} (${m.dosage})`).join('、');

      const prompt = `你是一位专业的临床药师。请分析以下药物组合的相互作用风险：

药物列表：${medicineList}

请按以下JSON格式提供分析：
{
  "riskLevel": "风险等级（low/medium/high/critical）",
  "interactions": [
    {
      "drugs": ["药物A", "药物B"],
      "severity": "严重程度（轻度/中度/严重）",
      "description": "相互作用描述",
      "clinicalSignificance": "临床意义",
      "management": "管理建议"
    }
  ],
  "overallAssessment": "总体评估",
  "recommendations": ["建议1", "建议2"]
}

要求：
1. 识别所有可能的药物相互作用
2. 评估每个相互作用的临床意义
3. 提供具体的管理建议
4. 如果有严重相互作用，建议替代方案`;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位资深的临床药师，拥有丰富的药物相互作用知识。你的分析应该基于循证医学证据，并考虑临床实际情况。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 2000,
        temperature: 0.3
      });

      const aiContent = response.message?.content || '';

      // 解析JSON
      let result: any;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = {
            riskLevel: 'unknown',
            interactions: [],
            overallAssessment: aiContent,
            recommendations: []
          };
        }
      } catch (parseError) {
        result = {
          riskLevel: 'unknown',
          interactions: [],
          overallAssessment: aiContent,
          recommendations: []
        };
      }

      logger.info(`AI药物相互作用检查完成 - 风险等级: ${result.riskLevel}`);
      return result;
    } catch (error) {
      logger.error('AI药物相互作用检查失败:', error);
      throw new Error('AI药物相互作用检查服务暂时不可用');
    }
  }

  /**
   * AI禁忌症检查
   * 根据患者病史和过敏史检查用药禁忌
   */
  async checkContraindication(request: {
    medicines: Array<{ name: string; dosage: string }>;
    patientInfo: {
      age: number;
      gender: string;
      allergies?: string;
      medicalHistory?: string;
      currentConditions?: string;
    };
  }) {
    try {
      const { medicines, patientInfo } = request;
      const medicineList = medicines.map(m => `${m.name} (${m.dosage})`).join('、');

      const prompt = `你是一位专业的临床药师。请根据患者信息检查以下药物的使用禁忌：

患者信息：
- 年龄：${patientInfo.age}岁
- 性别：${patientInfo.gender}
- 过敏史：${patientInfo.allergies || '无'}
- 既往病史：${patientInfo.medicalHistory || '无'}
- 当前疾病：${patientInfo.currentConditions || '无'}

药物列表：${medicineList}

请按以下JSON格式提供分析：
{
  "contraindications": [
    {
      "medicine": "药物名称",
      "severity": "严重程度（禁用/慎用/注意）",
      "reason": "禁忌原因",
      "evidence": "循证依据",
      "alternatives": ["替代药物建议"]
    }
  ],
  "warnings": ["警告信息"],
  "recommendations": ["用药建议"]
}

要求：
1. 检查每种药物的禁忌症
2. 考虑患者的特殊情况（年龄、性别、过敏史、病史）
3. 提供安全的替代方案
4. 给出明确的用药建议`;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位资深的临床药师，擅长识别用药禁忌和特殊人群用药注意事项。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 2000,
        temperature: 0.3
      });

      const aiContent = response.message?.content || '';

      // 解析JSON
      let result: any;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = {
            contraindications: [],
            warnings: [],
            recommendations: [aiContent]
          };
        }
      } catch (parseError) {
        result = {
          contraindications: [],
          warnings: [],
          recommendations: [aiContent]
        };
      }

      logger.info('AI禁忌症检查完成');
      return result;
    } catch (error) {
      logger.error('AI禁忌症检查失败:', error);
      throw new Error('AI禁忌症检查服务暂时不可用');
    }
  }

  /**
   * AI剂量合理性检查
   * 根据患者年龄、体重、肝肾功能评估剂量是否合理
   */
  async checkDosage(request: {
    medicine: string;
    dosage: string;
    frequency: string;
    patientInfo: {
      age: number;
      gender: string;
      weight?: number;
      height?: number;
      renalFunction?: string;
      hepaticFunction?: string;
    };
  }) {
    try {
      const { medicine, dosage, frequency, patientInfo } = request;

      const prompt = `你是一位专业的临床药师。请评估以下用药方案的剂量合理性：

药物：${medicine}
剂量：${dosage}
用法：${frequency}

患者信息：
- 年龄：${patientInfo.age}岁
- 性别：${patientInfo.gender}
${patientInfo.weight ? `- 体重：${patientInfo.weight}kg` : ''}
${patientInfo.height ? `- 身高：${patientInfo.height}cm` : ''}
${patientInfo.renalFunction ? `- 肾功能：${patientInfo.renalFunction}` : ''}
${patientInfo.hepaticFunction ? `- 肝功能：${patientInfo.hepaticFunction}` : ''}

请按以下JSON格式提供分析：
{
  "isAppropriate": true/false,
  "assessment": "剂量评估结论（合理/偏低/偏高/需调整）",
  "standardDosage": "标准剂量范围",
  "recommendedDosage": "推荐剂量",
  "adjustmentReason": "调整原因（如需调整）",
  "specialConsiderations": ["特殊考虑因素"],
  "monitoringParameters": ["需监测的指标"]
}

要求：
1. 基于患者的年龄、体重、肝肾功能评估剂量
2. 考虑特殊人群（儿童、老年人、器官功能不全）的剂量调整
3. 提供具体的剂量建议
4. 说明需要监测的指标`;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位资深的临床药师，擅长个体化药物剂量调整和特殊人群用药管理。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 1500,
        temperature: 0.3
      });

      const aiContent = response.message?.content || '';

      // 解析JSON
      let result: any;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = {
            isAppropriate: true,
            assessment: '需要人工审核',
            standardDosage: '未知',
            recommendedDosage: dosage,
            adjustmentReason: '',
            specialConsiderations: [aiContent],
            monitoringParameters: []
          };
        }
      } catch (parseError) {
        result = {
          isAppropriate: true,
          assessment: '需要人工审核',
          standardDosage: '未知',
          recommendedDosage: dosage,
          adjustmentReason: '',
          specialConsiderations: [aiContent],
          monitoringParameters: []
        };
      }

      logger.info(`AI剂量检查完成 - ${medicine}: ${result.assessment}`);
      return result;
    } catch (error) {
      logger.error('AI剂量检查失败:', error);
      throw new Error('AI剂量检查服务暂时不可用');
    }
  }

  /**
   * AI处方智能审核
   * 综合评估处方的合理性、安全性和有效性
   */
  async reviewPrescription(request: {
    diagnosis: string;
    medicines: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
    }>;
    patientInfo: {
      age: number;
      gender: string;
      allergies?: string;
      medicalHistory?: string;
    };
  }) {
    try {
      const { diagnosis, medicines, patientInfo } = request;
      const medicineList = medicines.map(
        m => `- ${m.name} ${m.dosage} ${m.frequency} ${m.duration}`
      ).join('\n');

      const prompt = `你是一位资深的临床药师，请对以下处方进行全面审核：

诊断：${diagnosis}

患者信息：
- 年龄：${patientInfo.age}岁
- 性别：${patientInfo.gender}
- 过敏史：${patientInfo.allergies || '无'}
- 既往病史：${patientInfo.medicalHistory || '无'}

处方药物：
${medicineList}

请按以下JSON格式提供审核结果：
{
  "overallApproval": "approve/reject/conditional",
  "riskLevel": "低风险/中风险/高风险",
  "appropriateness": {
    "score": 0-100,
    "assessment": "处方合理性评估"
  },
  "issues": [
    {
      "severity": "严重/警告/提示",
      "category": "类别（相互作用/禁忌症/剂量/疗程等）",
      "description": "问题描述",
      "recommendation": "建议"
    }
  ],
  "strengths": ["处方优点"],
  "improvements": ["改进建议"],
  "summary": "审核总结"
}

要求：
1. 评估处方与诊断的符合性
2. 检查药物相互作用
3. 验证剂量和用法的合理性
4. 考虑患者特殊情况
5. 提供明确的审批意见`;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位经验丰富的临床药师，负责处方审核工作。你的审核应该严谨、专业，确保患者用药安全。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 2500,
        temperature: 0.3
      });

      const aiContent = response.message?.content || '';

      // 解析JSON
      let result: any;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = {
            overallApproval: 'conditional',
            riskLevel: '需人工审核',
            appropriateness: {
              score: 50,
              assessment: aiContent
            },
            issues: [],
            strengths: [],
            improvements: [],
            summary: aiContent
          };
        }
      } catch (parseError) {
        result = {
          overallApproval: 'conditional',
          riskLevel: '需人工审核',
          appropriateness: {
            score: 50,
            assessment: aiContent
          },
          issues: [],
          strengths: [],
          improvements: [],
          summary: aiContent
        };
      }

      logger.info(`AI处方审核完成 - 结论: ${result.overallApproval}`);
      return result;
    } catch (error) {
      logger.error('AI处方审核失败:', error);
      throw new Error('AI处方审核服务暂时不可用');
    }
  }

  /**
   * AI替代药物建议
   * 在药物不可用或有禁忌时,提供替代药物建议
   */
  async suggestAlternative(request: {
    originalMedicine: string;
    reason: string;
    indication: string;
    patientInfo?: {
      age?: number;
      allergies?: string;
      medicalHistory?: string;
    };
  }) {
    try {
      const { originalMedicine, reason, indication, patientInfo } = request;

      const prompt = `你是一位经验丰富的临床药师。请为以下情况推荐替代药物：

原药物：${originalMedicine}
替代原因：${reason}
适应症：${indication}

${patientInfo ? `患者信息：
- 年龄：${patientInfo.age}岁
- 过敏史：${patientInfo.allergies || '无'}
- 既往病史：${patientInfo.medicalHistory || '无'}` : ''}

请按以下JSON格式提供建议：
{
  "alternatives": [
    {
      "medicine": "替代药物名称",
      "reason": "推荐理由",
      "dosage": "推荐剂量",
      "advantages": ["优点"],
      "considerations": ["注意事项"],
      "costComparison": "价格对比"
    }
  ],
  "recommendations": "总体建议"
}

要求：
1. 推荐2-3种替代药物
2. 考虑药物的有效性、安全性、经济性
3. 说明每种药物的优缺点
4. 提供具体的用法用量建议`;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位资深的临床药师，熟悉各类药物的特性和替代方案。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 1500,
        temperature: 0.5
      });

      const aiContent = response.message?.content || '';

      // 解析JSON
      let result: any;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = {
            alternatives: [],
            recommendations: aiContent
          };
        }
      } catch (parseError) {
        result = {
          alternatives: [],
          recommendations: aiContent
        };
      }

      logger.info('AI替代药物建议生成完成');
      return result;
    } catch (error) {
      logger.error('AI替代药物建议失败:', error);
      throw new Error('AI替代药物建议服务暂时不可用');
    }
  }

  /**
   * AI病历智能总结
   * 自动生成病历摘要，提取关键信息
   */
  async summarizeMedicalRecord(request: {
    chiefComplaint: string;
    presentIllness: string;
    pastHistory?: string;
    physicalExam?: string;
    diagnosis: string;
    treatmentPlan: string;
  }): Promise<string> {
    try {
      const { chiefComplaint, presentIllness, pastHistory, physicalExam, diagnosis, treatmentPlan } = request;

      const prompt = `你是一位专业的医疗文书助手。请为以下病历生成简洁的摘要（200字以内）：

主诉：${chiefComplaint}
现病史：${presentIllness}
${pastHistory ? `既往史：${pastHistory}` : ''}
${physicalExam ? `体格检查：${physicalExam}` : ''}
诊断：${diagnosis}
治疗方案：${treatmentPlan}

要求：
1. 摘要应包含关键诊断和治疗信息
2. 语言简洁专业
3. 突出重点，易于快速了解病情
4. 控制在200字以内`;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位经验丰富的医疗文书助手，擅长提炼病历关键信息。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 500,
        temperature: 0.5
      });

      const summary = response.message?.content || '生成摘要失败';

      logger.info('AI病历摘要生成完成');
      return summary;
    } catch (error) {
      logger.error('AI病历摘要生成失败:', error);
      throw new Error('AI病历摘要服务暂时不可用');
    }
  }

  /**
   * AI病历质量检查
   * 检查病历的完整性和规范性
   */
  async checkMedicalRecordQuality(request: {
    chiefComplaint: string;
    presentIllness: string;
    pastHistory?: string;
    familyHistory?: string;
    physicalExam?: string;
    auxiliaryExam?: string;
    diagnosis: string;
    treatmentPlan: string;
  }): Promise<{
    overallScore: number;
    completeness: { score: number; missing: string[] };
    accuracy: { score: number; issues: string[] };
    standardization: { score: number; suggestions: string[] };
    recommendations: string[];
  }> {
    try {
      const {
        chiefComplaint,
        presentIllness,
        pastHistory,
        familyHistory,
        physicalExam,
        auxiliaryExam,
        diagnosis,
        treatmentPlan
      } = request;

      const prompt = `你是一位资深的病历质控专家。请对以下病历进行质量评估：

主诉：${chiefComplaint || '（缺失）'}
现病史：${presentIllness || '（缺失）'}
既往史：${pastHistory || '（缺失）'}
家族史：${familyHistory || '（缺失）'}
体格检查：${physicalExam || '（缺失）'}
辅助检查：${auxiliaryExam || '（缺失）'}
诊断：${diagnosis || '（缺失）'}
治疗方案：${treatmentPlan || '（缺失）'}

请按以下JSON格式提供评估：
{
  "overallScore": 0-100,
  "completeness": {
    "score": 0-100,
    "missing": ["缺失的内容项"]
  },
  "accuracy": {
    "score": 0-100,
    "issues": ["准确性问题"]
  },
  "standardization": {
    "score": 0-100,
    "suggestions": ["规范性建议"]
  },
  "recommendations": ["总体改进建议"]
}

评估维度：
1. 完整性：病历各项是否齐全
2. 准确性：描述是否准确、逻辑是否连贯
3. 规范性：是否符合病历书写规范
4. 提供具体的改进建议`;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位资深的病历质控专家，熟悉病历书写规范和质量标准。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 1500,
        temperature: 0.3
      });

      const aiContent = response.message?.content || '';

      // 解析JSON
      let result: any;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = {
            overallScore: 60,
            completeness: { score: 60, missing: [] },
            accuracy: { score: 60, issues: [] },
            standardization: { score: 60, suggestions: [] },
            recommendations: [aiContent]
          };
        }
      } catch (parseError) {
        result = {
          overallScore: 60,
          completeness: { score: 60, missing: [] },
          accuracy: { score: 60, issues: [] },
          standardization: { score: 60, suggestions: [] },
          recommendations: [aiContent]
        };
      }

      logger.info(`AI病历质量检查完成 - 总分: ${result.overallScore}`);
      return result;
    } catch (error) {
      logger.error('AI病历质量检查失败:', error);
      throw new Error('AI病历质量检查服务暂时不可用');
    }
  }

  /**
   * AI诊断建议生成
   * 基于症状和检查结果提供诊断建议
   */
  async generateDiagnosisSuggestion(request: {
    chiefComplaint: string;
    symptoms: string;
    physicalExam?: string;
    auxiliaryExam?: string;
    patientInfo?: {
      age: number;
      gender: string;
      medicalHistory?: string;
    };
  }): Promise<{
    suggestedDiagnoses: Array<{
      diagnosis: string;
      confidence: string;
      reasoning: string;
      icd10Code?: string;
    }>;
    differentialDiagnoses: string[];
    recommendedTests: string[];
    notes: string;
  }> {
    try {
      const { chiefComplaint, symptoms, physicalExam, auxiliaryExam, patientInfo } = request;

      const prompt = `你是一位经验丰富的临床医生。请根据以下信息提供诊断建议：

主诉：${chiefComplaint}
症状描述：${symptoms}
${physicalExam ? `体格检查：${physicalExam}` : ''}
${auxiliaryExam ? `辅助检查：${auxiliaryExam}` : ''}

${patientInfo ? `患者信息：
- 年龄：${patientInfo.age}岁
- 性别：${patientInfo.gender}
- 既往病史：${patientInfo.medicalHistory || '无'}` : ''}

请按以下JSON格式提供诊断建议：
{
  "suggestedDiagnoses": [
    {
      "diagnosis": "诊断名称",
      "confidence": "可能性（高/中/低）",
      "reasoning": "诊断依据",
      "icd10Code": "ICD-10编码（如知道）"
    }
  ],
  "differentialDiagnoses": ["鉴别诊断1", "鉴别诊断2"],
  "recommendedTests": ["建议的检查项目"],
  "notes": "诊断注意事项"
}

要求：
1. 提供2-4个可能的诊断，按可能性排序
2. 每个诊断都要说明依据
3. 提供鉴别诊断
4. 建议必要的检查项目`;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位资深的临床医生，具有丰富的诊断经验。你的建议应该基于循证医学，考虑常见病优先原则。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 2000,
        temperature: 0.6
      });

      const aiContent = response.message?.content || '';

      // 解析JSON
      let result: any;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = {
            suggestedDiagnoses: [],
            differentialDiagnoses: [],
            recommendedTests: [],
            notes: aiContent
          };
        }
      } catch (parseError) {
        result = {
          suggestedDiagnoses: [],
          differentialDiagnoses: [],
          recommendedTests: [],
          notes: aiContent
        };
      }

      logger.info('AI诊断建议生成完成');
      return result;
    } catch (error) {
      logger.error('AI诊断建议生成失败:', error);
      throw new Error('AI诊断建议服务暂时不可用');
    }
  }

  /**
   * AI治疗方案建议
   * 基于诊断和患者情况生成治疗方案建议
   */
  async generateTreatmentSuggestion(request: {
    diagnosis: string;
    symptoms: string;
    patientInfo: {
      age: number;
      gender: string;
      allergies?: string;
      medicalHistory?: string;
      currentMedications?: string;
    };
  }): Promise<{
    treatmentPlan: string;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      notes: string;
    }>;
    lifestyle: string[];
    followUp: string;
    warnings: string[];
  }> {
    try {
      const { diagnosis, symptoms, patientInfo } = request;

      const prompt = `你是一位经验丰富的临床医生。请为以下情况制定治疗方案：

诊断：${diagnosis}
症状：${symptoms}

患者信息：
- 年龄：${patientInfo.age}岁
- 性别：${patientInfo.gender}
- 过敏史：${patientInfo.allergies || '无'}
- 既往病史：${patientInfo.medicalHistory || '无'}
${patientInfo.currentMedications ? `- 正在服用的药物：${patientInfo.currentMedications}` : ''}

请按以下JSON格式提供治疗方案：
{
  "treatmentPlan": "总体治疗方案说明",
  "medications": [
    {
      "name": "药物名称",
      "dosage": "剂量",
      "frequency": "用药频率",
      "duration": "疗程",
      "notes": "注意事项"
    }
  ],
  "lifestyle": ["生活方式建议"],
  "followUp": "随访计划",
  "warnings": ["注意事项和警告"]
}

要求：
1. 治疗方案应符合临床指南
2. 考虑患者的特殊情况（年龄、过敏史等）
3. 药物选择合理，剂量准确
4. 提供明确的随访计划
5. 强调重要的注意事项`;

      const response = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位资深的临床医生，擅长制定个体化的治疗方案。你的方案应该基于循证医学，考虑患者的具体情况。'
          },
          {
            role: MessageRole.USER,
            content: prompt
          }
        ],
        maxTokens: 2000,
        temperature: 0.5
      });

      const aiContent = response.message?.content || '';

      // 解析JSON
      let result: any;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = {
            treatmentPlan: aiContent,
            medications: [],
            lifestyle: [],
            followUp: '请定期复诊',
            warnings: []
          };
        }
      } catch (parseError) {
        result = {
          treatmentPlan: aiContent,
          medications: [],
          lifestyle: [],
          followUp: '请定期复诊',
          warnings: []
        };
      }

      logger.info('AI治疗方案建议生成完成');
      return result;
    } catch (error) {
      logger.error('AI治疗方案建议生成失败:', error);
      throw new Error('AI治疗方案建议服务暂时不可用');
    }
  }

  /**
   * AI病历智能检索
   * 基于自然语言查询病历
   */
  async searchMedicalRecords(request: {
    query: string;
    patientId?: string;
    dateRange?: { from: Date; to: Date };
    limit?: number;
  }): Promise<{
    results: Array<{
      recordId: string;
      recordNo: string;
      relevance: number;
      summary: string;
      matchedContent: string;
    }>;
    aiResponse: string;  // 改为aiResponse以匹配测试预期
  }> {
    try {
      const { query } = request;
      // Future implementation will use: patientId, dateRange, limit

      // 首先，使用AI理解搜索意图
      const interpretPrompt = `你是一位医疗信息检索专家。请分析以下搜索查询，提取关键信息：

查询：${query}

请按以下JSON格式提供分析：
{
  "intent": "搜索意图",
  "keywords": ["关键词1", "关键词2"],
  "filters": {
    "symptoms": ["症状"],
    "diagnoses": ["诊断"],
    "treatments": ["治疗"]
  }
}`;

      const interpretResponse = await this.aiManager.chat({
        messages: [
          {
            role: MessageRole.SYSTEM,
            content: '你是一位医疗信息检索专家，擅长理解医疗查询意图。'
          },
          {
            role: MessageRole.USER,
            content: interpretPrompt
          }
        ],
        maxTokens: 500,
        temperature: 0.3
      });

      const interpretation = interpretResponse.message?.content || query;

      // 实际项目中，这里应该调用向量数据库或全文搜索引擎
      // 这里返回一个示例结构
      const results = [
        {
          recordId: 'example-id-1',
          recordNo: 'R20250101001',
          relevance: 0.95,
          summary: '根据查询匹配的病历摘要',
          matchedContent: '匹配的病历内容片段'
        }
      ];

      logger.info(`AI病历检索完成 - 查询: ${query}, 结果数: ${results.length}`);
      return {
        results,
        aiResponse: interpretation  // 改为aiResponse
      };
    } catch (error) {
      logger.error('AI病历检索失败:', error);
      throw new Error('AI病历检索服务暂时不可用');
    }
  }
}
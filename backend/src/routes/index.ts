import { Router } from 'express';
import aiRoutes from './ai.routes';
import mcpRoutes from './mcp.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import patientRoutes from './patient.routes';
import aiAssistantRoutes from './ai-assistant.routes';
import appointmentRoutes from './appointment.routes';
import queueRoutes from './queue.routes';
import medicineRoutes from './medicine.routes';
import prescriptionRoutes from './prescription.routes';
import medicalRecordRoutes from './medical-record.routes';
import diagnosisRoutes from './diagnosis.routes';
import recordTemplateRoutes from './record-template.routes';
import departmentRoutes from './department.routes';
import doctorRoutes from './doctor.routes';
import statisticsRoutes from './statistics.routes';
import announcementRoutes from './announcement.routes';

const router = Router();

// API版本前缀
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/ai', aiRoutes);
router.use('/mcp', mcpRoutes);
router.use('/patients', patientRoutes);
router.use('/ai-assistant', aiAssistantRoutes);
router.use('/departments', departmentRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/queue', queueRoutes);
router.use('/medicines', medicineRoutes);
router.use('/prescriptions', prescriptionRoutes);
// 里程碑6: 病历管理路由
router.use('/medical-records', medicalRecordRoutes);
router.use('/diagnoses', diagnosisRoutes);
router.use('/record-templates', recordTemplateRoutes);
// 里程碑7: 统计报表路由
router.use('/statistics', statisticsRoutes);
// 里程碑7: 系统公告路由
router.use('/announcements', announcementRoutes);

// API根路径信息
router.get('/', (_req, res) => {
  res.json({
    message: 'AiliaoX API v1',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/v1/auth/login',
        logout: 'POST /api/v1/auth/logout',
        refresh: 'POST /api/v1/auth/refresh',
        me: 'GET /api/v1/auth/me',
        password: 'PUT /api/v1/auth/password',
      },
      users: {
        list: 'GET /api/v1/users',
        detail: 'GET /api/v1/users/:id',
        create: 'POST /api/v1/users',
        update: 'PUT /api/v1/users/:id',
        delete: 'DELETE /api/v1/users/:id',
      },
      patients: {
        list: 'GET /api/v1/patients',
        create: 'POST /api/v1/patients',
        detail: 'GET /api/v1/patients/:id',
        update: 'PUT /api/v1/patients/:id',
        delete: 'DELETE /api/v1/patients/:id',
        records: 'GET /api/v1/patients/:id/records',
        statistics: 'GET /api/v1/patients/:id/statistics',
        addTag: 'POST /api/v1/patients/:id/tags',
        removeTag: 'DELETE /api/v1/patients/:id/tags/:tag',
        globalStats: 'GET /api/v1/patients/statistics/global',
      },
      appointments: {
        list: 'GET /api/v1/appointments',
        create: 'POST /api/v1/appointments',
        detail: 'GET /api/v1/appointments/:id',
        update: 'PUT /api/v1/appointments/:id',
        cancel: 'DELETE /api/v1/appointments/:id',
        patientHistory: 'GET /api/v1/appointments/patient/:patientId/history',
        doctorList: 'GET /api/v1/appointments/doctor/:doctorId',
        deptStats: 'GET /api/v1/appointments/department/:departmentId/statistics',
        checkAvailability: 'GET /api/v1/appointments/check-availability',
      },
      queue: {
        create: 'POST /api/v1/queue',
        detail: 'GET /api/v1/queue/:id',
        byNumber: 'GET /api/v1/queue/number/:queueNumber',
        deptList: 'GET /api/v1/queue/department/:departmentId',
        doctorList: 'GET /api/v1/queue/doctor/:doctorId',
        callNext: 'POST /api/v1/queue/call-next',
        complete: 'PUT /api/v1/queue/:id/complete',
        cancel: 'DELETE /api/v1/queue/:id',
        position: 'GET /api/v1/queue/:id/position',
        deptStats: 'GET /api/v1/queue/department/:departmentId/statistics',
      },
      aiAssistant: {
        diagnose: 'POST /api/v1/ai-assistant/diagnose',
        analyzePatient: 'POST /api/v1/ai-assistant/analyze-patient',
        quickRecord: 'POST /api/v1/ai-assistant/quick-record',
        medicalQA: 'POST /api/v1/ai-assistant/medical-qa',
        suggestions: 'GET /api/v1/ai-assistant/suggestions/:patientId',
        checkDrugInteraction: 'POST /api/v1/ai-assistant/check-drug-interaction',
        checkContraindication: 'POST /api/v1/ai-assistant/check-contraindication',
        checkDosage: 'POST /api/v1/ai-assistant/check-dosage',
        reviewPrescription: 'POST /api/v1/ai-assistant/review-prescription',
        suggestAlternative: 'POST /api/v1/ai-assistant/suggest-alternative',
        summarizeMedicalRecord: 'POST /api/v1/ai-assistant/medical-record/summarize',
        checkMedicalRecordQuality: 'POST /api/v1/ai-assistant/medical-record/quality-check',
        suggestDiagnosis: 'POST /api/v1/ai-assistant/diagnosis/suggest',
        suggestTreatment: 'POST /api/v1/ai-assistant/treatment/suggest',
        searchMedicalRecords: 'POST /api/v1/ai-assistant/medical-records/search',
      },
      medicines: {
        list: 'GET /api/v1/medicines',
        create: 'POST /api/v1/medicines',
        detail: 'GET /api/v1/medicines/:id',
        update: 'PUT /api/v1/medicines/:id',
        delete: 'DELETE /api/v1/medicines/:id',
        search: 'GET /api/v1/medicines/search/quick',
        stock: 'GET /api/v1/medicines/:id/stock',
        statistics: 'GET /api/v1/medicines/statistics/overview',
        categories: 'GET /api/v1/medicines/categories',
        createCategory: 'POST /api/v1/medicines/categories',
      },
      prescriptions: {
        list: 'GET /api/v1/prescriptions',
        create: 'POST /api/v1/prescriptions',
        detail: 'GET /api/v1/prescriptions/:id',
        update: 'PUT /api/v1/prescriptions/:id',
        cancel: 'DELETE /api/v1/prescriptions/:id',
        approve: 'POST /api/v1/prescriptions/:id/approve',
        dispense: 'POST /api/v1/prescriptions/:id/dispense',
        print: 'GET /api/v1/prescriptions/:id/print',
        patientHistory: 'GET /api/v1/prescriptions/patient/:patientId',
        doctorStats: 'GET /api/v1/prescriptions/doctor/:doctorId/statistics',
        statistics: 'GET /api/v1/prescriptions/statistics/overview',
      },
      medicalRecords: {
        list: 'GET /api/v1/medical-records',
        create: 'POST /api/v1/medical-records',
        detail: 'GET /api/v1/medical-records/:id',
        update: 'PUT /api/v1/medical-records/:id',
        delete: 'DELETE /api/v1/medical-records/:id',
        patientRecords: 'GET /api/v1/medical-records/patient/:patientId',
        submit: 'POST /api/v1/medical-records/:id/submit',
        approve: 'POST /api/v1/medical-records/:id/approve',
        reject: 'POST /api/v1/medical-records/:id/reject',
      },
      diagnoses: {
        list: 'GET /api/v1/diagnoses',
        create: 'POST /api/v1/diagnoses',
        detail: 'GET /api/v1/diagnoses/:id',
        update: 'PUT /api/v1/diagnoses/:id',
        delete: 'DELETE /api/v1/diagnoses/:id',
        patientHistory: 'GET /api/v1/diagnoses/patient/:patientId',
        commonDiagnoses: 'GET /api/v1/diagnoses/statistics/common',
        statistics: 'GET /api/v1/diagnoses/statistics/overview',
        icd10: 'GET /api/v1/diagnoses/icd10/:code',
      },
      recordTemplates: {
        list: 'GET /api/v1/record-templates',
        create: 'POST /api/v1/record-templates',
        detail: 'GET /api/v1/record-templates/:id',
        update: 'PUT /api/v1/record-templates/:id',
        delete: 'DELETE /api/v1/record-templates/:id',
        popular: 'GET /api/v1/record-templates/popular',
        use: 'POST /api/v1/record-templates/:id/use',
        statistics: 'GET /api/v1/record-templates/statistics/overview',
      },
      statistics: {
        dashboard: 'GET /api/v1/statistics/dashboard',
        patients: 'GET /api/v1/statistics/patients',
        doctors: 'GET /api/v1/statistics/doctors',
        departments: 'GET /api/v1/statistics/departments',
        appointments: 'GET /api/v1/statistics/appointments',
        prescriptions: 'GET /api/v1/statistics/prescriptions',
        medicalRecords: 'GET /api/v1/statistics/medical-records',
      },
      announcements: {
        list: 'GET /api/v1/announcements',
        create: 'POST /api/v1/announcements',
        detail: 'GET /api/v1/announcements/:id',
        update: 'PUT /api/v1/announcements/:id',
        delete: 'DELETE /api/v1/announcements/:id',
        active: 'GET /api/v1/announcements/active/list',
        publish: 'POST /api/v1/announcements/:id/publish',
        archive: 'POST /api/v1/announcements/:id/archive',
        markRead: 'POST /api/v1/announcements/:id/read',
      },
      ai: {
        chat: 'POST /api/v1/ai/chat',
        providers: 'GET /api/v1/ai/providers',
        switchProvider: 'POST /api/v1/ai/provider/switch',
      },
      mcp: {
        query: 'POST /api/v1/mcp/query',
        tools: 'GET /api/v1/mcp/tools',
        callTool: 'POST /api/v1/mcp/tool/call',
        status: 'GET /api/v1/mcp/status',
      },
    },
  });
});

export default router;
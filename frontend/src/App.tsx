/**
 * App组件 - 应用路由配置
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { PatientListPage } from './pages/PatientListPage'
import { PatientDetailPage } from './pages/PatientDetailPage'
import { AppointmentPage } from './pages/AppointmentPage'
import { AppointmentHistoryPage } from './pages/AppointmentHistoryPage'
import { DoctorQueuePage } from './pages/DoctorQueuePage'
import { QueueDisplayPage } from './pages/QueueDisplayPage'
import { PatientQueueStatusPage } from './pages/PatientQueueStatusPage'
import { MedicineListPage } from './pages/MedicineListPage'
import { PrescriptionListPage } from './pages/PrescriptionListPage'
import { PrescriptionFormPage } from './pages/PrescriptionFormPage'
import { PrescriptionDetailPage } from './pages/PrescriptionDetailPage'
import { MedicalRecordListPage } from './pages/MedicalRecordListPage'
import { MedicalRecordFormPage } from './pages/MedicalRecordFormPage'
import { MedicalRecordDetailPage } from './pages/MedicalRecordDetailPage'
import { AISearchPage } from './pages/AISearchPage'
import { TemplateManagementPage } from './pages/TemplateManagementPage'
import { DashboardPage } from './pages/DashboardPage'
import { AnnouncementListPage } from './pages/AnnouncementListPage'
import { AnnouncementDetailPage } from './pages/AnnouncementDetailPage'
import { AnnouncementFormPage } from './pages/AnnouncementFormPage'
import { LandingPage } from './pages/LandingPage'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { useAuthStore } from './store/auth.store'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      {/* 首页登陆前体验 */}
      <Route path="/" element={<LandingPage />} />

      {/* 公开路由 */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/patients" replace /> : <LoginPage />}
      />

      {/* 公开路由 - 叫号大屏显示 */}
      <Route path="/queue/display" element={<QueueDisplayPage />} />

      {/* 公开路由 - 患者排队状态查询 */}
      <Route path="/queue/status" element={<PatientQueueStatusPage />} />

      {/* 受保护路由 - 患者管理 */}
      <Route
        path="/patients"
        element={
          <ProtectedRoute>
            <PatientListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patients/:id"
        element={
          <ProtectedRoute>
            <PatientDetailPage />
          </ProtectedRoute>
        }
      />

      {/* 受保护路由 - 挂号管理 */}
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <AppointmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments/history"
        element={
          <ProtectedRoute>
            <AppointmentHistoryPage />
          </ProtectedRoute>
        }
      />

      {/* 受保护路由 - 医生叫号控制台 */}
      <Route
        path="/doctor/queue"
        element={
          <ProtectedRoute>
            <DoctorQueuePage />
          </ProtectedRoute>
        }
      />

      {/* 受保护路由 - 仪表盘 */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* 受保护路由 - 药物库管理 */}
      <Route
        path="/medicines"
        element={
          <ProtectedRoute>
            <MedicineListPage />
          </ProtectedRoute>
        }
      />

      {/* 受保护路由 - 处方管理 */}
      <Route
        path="/prescriptions"
        element={
          <ProtectedRoute>
            <PrescriptionListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prescriptions/new"
        element={
          <ProtectedRoute>
            <PrescriptionFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prescriptions/:id"
        element={
          <ProtectedRoute>
            <PrescriptionDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prescriptions/:id/edit"
        element={
          <ProtectedRoute>
            <PrescriptionFormPage />
          </ProtectedRoute>
        }
      />

      {/* 受保护路由 - 病历管理 */}
      <Route
        path="/medical-records"
        element={
          <ProtectedRoute>
            <MedicalRecordListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records/new"
        element={
          <ProtectedRoute>
            <MedicalRecordFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records/search"
        element={
          <ProtectedRoute>
            <AISearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records/:id"
        element={
          <ProtectedRoute>
            <MedicalRecordDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records/:id/edit"
        element={
          <ProtectedRoute>
            <MedicalRecordFormPage />
          </ProtectedRoute>
        }
      />

      {/* 受保护路由 - 病历模板管理 */}
      <Route
        path="/templates"
        element={
          <ProtectedRoute>
            <TemplateManagementPage />
          </ProtectedRoute>
        }
      />

      {/* 受保护路由 - 系统公告 */}
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <AnnouncementListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/new"
        element={
          <ProtectedRoute requiredPermissions={['system:manage']}>
            <AnnouncementFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/:id"
        element={
          <ProtectedRoute>
            <AnnouncementDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/:id/edit"
        element={
          <ProtectedRoute requiredPermissions={['system:manage']}>
            <AnnouncementFormPage />
          </ProtectedRoute>
        }
      />

      {/* 占位路由 - 病历管理（兼容旧路径） */}
      <Route
        path="/records"
        element={<Navigate to="/medical-records" replace />}
      />

      {/* 404页面 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-background-primary flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gradient mb-4">404</h1>
              <p className="text-text-secondary mb-8">页面未找到</p>
              <a href="/" className="btn-neon px-6 py-3 inline-block">
                <span>返回首页</span>
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  )
}

export default App

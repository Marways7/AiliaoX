# AiliaoX 前端架构设计文档

## 1. 技术栈

### 1.1 核心技术
- **React 18.3+**: 使用最新React特性，包括并发特性和自动批处理
- **TypeScript 5.5+**: 严格类型检查，提升代码质量
- **Vite 5.4+**: 极速开发服务器和优化的生产构建

### 1.2 UI框架和样式
- **TailwindCSS 3.4**: 原子化CSS框架，未来感主题定制
- **HeadlessUI**: 无样式可访问组件（需安装）
- **Framer Motion 11.3**: 高性能动画库，流畅的页面过渡和交互动画
- **Lucide React**: 现代化图标库，支持未来感设计

### 1.3 状态管理
- **Zustand 4.5**: 轻量级全局状态管理
  - 用户认证状态
  - 主题配置
  - 全局通知
- **React Query 5.52**: 服务端状态管理
  - API数据缓存
  - 自动重新获取
  - 乐观更新

### 1.4 路由和导航
- **React Router 6.26**: 声明式路由
  - 嵌套路由
  - 懒加载
  - 路由守卫

### 1.5 表单和验证
- **React Hook Form 7.52**: 高性能表单管理
- **Zod 3.23**: TypeScript优先的Schema验证

### 1.6 数据可视化
- **Recharts 2.12**: 声明式React图表库
- **D3.js**: 自定义高级可视化（按需）

### 1.7 实时通信
- **Socket.io Client 4.7**: WebSocket实时通信
  - 排队叫号实时更新
  - 系统通知推送

---

## 2. 未来感UI设计系统

### 2.1 色彩系统

```typescript
// 主题配色 - 赛博朋克/未来科技风格
const colors = {
  // 主色调 - 霓虹蓝
  primary: {
    50: '#E6F7FF',
    100: '#BAE7FF',
    200: '#91D5FF',
    300: '#69C0FF',
    400: '#40A9FF',
    500: '#1890FF', // 主色
    600: '#096DD9',
    700: '#0050B3',
    800: '#003A8C',
    900: '#002766',
  },

  // 次要色 - 电子紫
  secondary: {
    50: '#F9F0FF',
    100: '#EFDBFF',
    200: '#D3ADF7',
    300: '#B37FEB',
    400: '#9254DE',
    500: '#722ED1', // 次要色
    600: '#531DAB',
    700: '#391085',
    800: '#22075E',
    900: '#120338',
  },

  // 强调色 - 霓虹青
  accent: {
    50: '#E6FFFB',
    100: '#B5F5EC',
    200: '#87E8DE',
    300: '#5CDBD3',
    400: '#36CFC9',
    500: '#13C2C2', // 强调色
    600: '#08979C',
    700: '#006D75',
    800: '#00474F',
    900: '#002329',
  },

  // 成功色 - 霓虹绿
  success: {
    500: '#52C41A',
    600: '#389E0D',
  },

  // 警告色 - 霓虹橙
  warning: {
    500: '#FAAD14',
    600: '#D48806',
  },

  // 错误色 - 霓虹红
  error: {
    500: '#FF4D4F',
    600: '#CF1322',
  },

  // 灰度 - 深色主题
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E8E8E8',
    300: '#D9D9D9',
    400: '#BFBFBF',
    500: '#8C8C8C',
    600: '#595959',
    700: '#434343',
    800: '#262626',
    900: '#1F1F1F',
    950: '#141414', // 背景色
  },

  // 背景和表面
  background: {
    primary: '#0A0E27',   // 主背景 - 深蓝黑
    secondary: '#151932', // 次背景 - 蓝灰
    tertiary: '#1E2139',  // 三级背景
    elevated: '#252A41',  // 浮起表面
  },

  // 边框和分割线
  border: {
    primary: 'rgba(64, 169, 255, 0.2)',   // 霓虹蓝边框
    secondary: 'rgba(114, 46, 209, 0.2)', // 电子紫边框
    subtle: 'rgba(255, 255, 255, 0.1)',   // 微弱边框
  },

  // 文本
  text: {
    primary: '#FFFFFF',       // 主文本
    secondary: '#A0AEC0',     // 次要文本
    tertiary: '#718096',      // 三级文本
    disabled: '#4A5568',      // 禁用文本
    accent: '#40A9FF',        // 强调文本
  },
}
```

### 2.2 字体系统

```typescript
const typography = {
  fontFamily: {
    sans: [
      'Inter',
      'Noto Sans SC',
      '-apple-system',
      'BlinkMacSystemFont',
      'system-ui',
      'sans-serif'
    ],
    mono: [
      'JetBrains Mono',
      'Fira Code',
      'Consolas',
      'monospace'
    ],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px
    '5xl': ['3rem', { lineHeight: '1' }],          // 48px
  },

  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
}
```

### 2.3 间距和圆角

```typescript
const spacing = {
  // 8px基础单位
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
}

const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.5rem',     // 24px
  '2xl': '2rem',    // 32px
  full: '9999px',
}
```

### 2.4 阴影和光效

```typescript
const boxShadow = {
  // 常规阴影
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // 霓虹光效 - 未来感核心
  'neon-blue': '0 0 10px rgba(64, 169, 255, 0.5), 0 0 20px rgba(64, 169, 255, 0.3), 0 0 30px rgba(64, 169, 255, 0.1)',
  'neon-purple': '0 0 10px rgba(114, 46, 209, 0.5), 0 0 20px rgba(114, 46, 209, 0.3), 0 0 30px rgba(114, 46, 209, 0.1)',
  'neon-cyan': '0 0 10px rgba(19, 194, 194, 0.5), 0 0 20px rgba(19, 194, 194, 0.3), 0 0 30px rgba(19, 194, 194, 0.1)',
  'neon-green': '0 0 10px rgba(82, 196, 26, 0.5), 0 0 20px rgba(82, 196, 26, 0.3), 0 0 30px rgba(82, 196, 26, 0.1)',

  // 内阴影
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
}
```

### 2.5 动画配置

```typescript
const animation = {
  // 持续时间
  duration: {
    fastest: '100ms',
    faster: '200ms',
    fast: '300ms',
    normal: '400ms',
    slow: '500ms',
    slower: '700ms',
    slowest: '1000ms',
  },

  // 缓动函数
  easing: {
    // 标准缓动
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',

    // 自定义缓动 - 弹性动画
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    snappy: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  },

  // Framer Motion预设
  variants: {
    // 淡入淡出
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },

    // 滑入滑出
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },

    // 缩放
    scale: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
    },

    // 霓虹脉冲 - 未来感特效
    neonPulse: {
      animate: {
        boxShadow: [
          '0 0 10px rgba(64, 169, 255, 0.5)',
          '0 0 20px rgba(64, 169, 255, 0.8)',
          '0 0 10px rgba(64, 169, 255, 0.5)',
        ],
      },
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },
}
```

---

## 3. 目录结构

```
frontend/
├── public/
│   ├── fonts/              # Inter, JetBrains Mono等字体
│   └── favicon.ico
├── src/
│   ├── @types/             # TypeScript类型定义
│   │   ├── api.d.ts        # API响应类型
│   │   ├── models.d.ts     # 数据模型类型
│   │   └── global.d.ts     # 全局类型
│   │
│   ├── api/                # API服务层
│   │   ├── client.ts       # Axios实例配置
│   │   ├── auth.api.ts     # 认证API
│   │   ├── patient.api.ts  # 患者API
│   │   ├── appointment.api.ts  # 挂号API
│   │   ├── queue.api.ts    # 排队API
│   │   ├── medicine.api.ts # 药物API
│   │   ├── prescription.api.ts # 处方API
│   │   ├── medical-record.api.ts # 病历API
│   │   └── ai-assistant.api.ts   # AI助手API
│   │
│   ├── assets/             # 静态资源
│   │   ├── images/
│   │   └── icons/
│   │
│   ├── components/         # 通用组件
│   │   ├── ui/             # 基础UI组件
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Tag.tsx
│   │   │   ├── Loading.tsx
│   │   │   ├── Empty.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/         # 布局组件
│   │   │   ├── AppLayout.tsx      # 应用主布局
│   │   │   ├── Sidebar.tsx        # 侧边栏
│   │   │   ├── Header.tsx         # 顶部导航
│   │   │   ├── Footer.tsx         # 页脚
│   │   │   └── index.ts
│   │   │
│   │   ├── form/           # 表单组件
│   │   │   ├── FormInput.tsx
│   │   │   ├── FormSelect.tsx
│   │   │   ├── FormTextarea.tsx
│   │   │   ├── FormDatePicker.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── shared/         # 共享组件
│   │       ├── AIChat.tsx         # AI聊天组件
│   │       ├── DataTable.tsx      # 数据表格
│   │       ├── SearchBar.tsx      # 搜索栏
│   │       ├── Notification.tsx   # 通知组件
│   │       └── index.ts
│   │
│   ├── features/           # 功能模块（按业务划分）
│   │   ├── auth/           # 认证模块
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RoleSelector.tsx
│   │   │   │   └── AuthGuard.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── usePermissions.ts
│   │   │   └── store/
│   │   │       └── authStore.ts   # Zustand store
│   │   │
│   │   ├── patient/        # 患者管理模块
│   │   │   ├── components/
│   │   │   │   ├── PatientList.tsx
│   │   │   │   ├── PatientDetail.tsx
│   │   │   │   ├── PatientForm.tsx
│   │   │   │   ├── PatientSearch.tsx
│   │   │   │   └── PatientStats.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── usePatients.ts
│   │   │   │   ├── usePatientDetail.ts
│   │   │   │   └── usePatientStats.ts
│   │   │   └── store/
│   │   │       └── patientStore.ts
│   │   │
│   │   ├── appointment/    # 挂号预约模块
│   │   │   ├── components/
│   │   │   │   ├── AppointmentList.tsx
│   │   │   │   ├── AppointmentForm.tsx
│   │   │   │   ├── DepartmentSelector.tsx
│   │   │   │   └── DoctorSelector.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAppointments.ts
│   │   │   │   └── useCreateAppointment.ts
│   │   │   └── store/
│   │   │       └── appointmentStore.ts
│   │   │
│   │   ├── queue/          # 排队叫号模块
│   │   │   ├── components/
│   │   │   │   ├── QueueDisplay.tsx      # 叫号大屏
│   │   │   │   ├── QueueList.tsx
│   │   │   │   ├── QueueControls.tsx
│   │   │   │   └── QueueStatus.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useQueue.ts
│   │   │   │   ├── useQueueSocket.ts     # WebSocket
│   │   │   │   └── useCallNext.ts
│   │   │   └── store/
│   │   │       └── queueStore.ts
│   │   │
│   │   ├── medicine/       # 药物管理模块
│   │   │   ├── components/
│   │   │   │   ├── MedicineList.tsx
│   │   │   │   ├── MedicineForm.tsx
│   │   │   │   ├── MedicineSearch.tsx
│   │   │   │   └── MedicineInventory.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useMedicines.ts
│   │   │   │   └── useMedicineInventory.ts
│   │   │   └── store/
│   │   │       └── medicineStore.ts
│   │   │
│   │   ├── prescription/   # 处方管理模块
│   │   │   ├── components/
│   │   │   │   ├── PrescriptionList.tsx
│   │   │   │   ├── PrescriptionForm.tsx
│   │   │   │   ├── PrescriptionDetail.tsx
│   │   │   │   └── PrescriptionPrint.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── usePrescriptions.ts
│   │   │   │   ├── useCreatePrescription.ts
│   │   │   │   └── usePrescriptionReview.ts
│   │   │   └── store/
│   │   │       └── prescriptionStore.ts
│   │   │
│   │   ├── medical-record/ # 病历管理模块
│   │   │   ├── components/
│   │   │   │   ├── MedicalRecordList.tsx
│   │   │   │   ├── MedicalRecordForm.tsx
│   │   │   │   ├── MedicalRecordDetail.tsx
│   │   │   │   ├── RecordSearch.tsx
│   │   │   │   └── RecordHistory.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useMedicalRecords.ts
│   │   │   │   ├── useRecordSearch.ts
│   │   │   │   └── useRecordSummary.ts
│   │   │   └── store/
│   │   │       └── medicalRecordStore.ts
│   │   │
│   │   └── ai-assistant/   # AI助手模块
│   │       ├── components/
│   │       │   ├── AIConsultation.tsx    # AI智能问诊
│   │       │   ├── AIAnalysis.tsx        # 患者数据分析
│   │       │   ├── AIRecordInput.tsx     # 病历快速录入
│   │       │   ├── AIDiagnosis.tsx       # 诊断辅助
│   │       │   ├── AITreatment.tsx       # 治疗方案建议
│   │       │   └── AIChatPanel.tsx       # AI聊天面板
│   │       ├── hooks/
│   │       │   ├── useAIDiagnose.ts
│   │       │   ├── useAIAnalysis.ts
│   │       │   ├── useAIRecordInput.ts
│   │       │   └── useAIChat.ts
│   │       └── store/
│   │           └── aiAssistantStore.ts
│   │
│   ├── hooks/              # 全局自定义Hooks
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useMediaQuery.ts
│   │   ├── usePermission.ts
│   │   └── usePagination.ts
│   │
│   ├── pages/              # 页面组件
│   │   ├── Login.tsx              # 登录页
│   │   ├── Dashboard.tsx          # 仪表盘
│   │   ├── PatientManagement.tsx  # 患者管理
│   │   ├── AppointmentManagement.tsx # 挂号管理
│   │   ├── QueueDisplay.tsx       # 排队叫号大屏
│   │   ├── MedicineManagement.tsx # 药物管理
│   │   ├── PrescriptionManagement.tsx # 处方管理
│   │   ├── MedicalRecordManagement.tsx # 病历管理
│   │   ├── AIAssistant.tsx        # AI助手
│   │   ├── Statistics.tsx         # 统计报表
│   │   ├── Settings.tsx           # 系统设置
│   │   └── NotFound.tsx           # 404页面
│   │
│   ├── routes/             # 路由配置
│   │   ├── index.tsx       # 路由配置入口
│   │   ├── PrivateRoute.tsx # 私有路由守卫
│   │   └── routes.config.ts # 路由配置
│   │
│   ├── store/              # 全局Store
│   │   ├── index.ts        # Store根
│   │   ├── uiStore.ts      # UI状态
│   │   ├── themeStore.ts   # 主题配置
│   │   └── notificationStore.ts # 通知系统
│   │
│   ├── styles/             # 全局样式
│   │   ├── globals.css     # 全局CSS
│   │   ├── animations.css  # 动画定义
│   │   └── utilities.css   # 工具类
│   │
│   ├── utils/              # 工具函数
│   │   ├── format.ts       # 格式化工具
│   │   ├── validation.ts   # 验证工具
│   │   ├── date.ts         # 日期工具
│   │   ├── storage.ts      # 存储工具
│   │   └── constants.ts    # 常量定义
│   │
│   ├── App.tsx             # 应用根组件
│   ├── main.tsx            # 应用入口
│   └── vite-env.d.ts       # Vite环境类型
│
├── tailwind.config.js      # TailwindCSS配置
├── postcss.config.js       # PostCSS配置
├── tsconfig.json           # TypeScript配置
├── vite.config.ts          # Vite配置
└── package.json
```

---

## 4. 状态管理策略

### 4.1 Zustand - 客户端状态

```typescript
// 认证状态
interface AuthStore {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  permissions: string[]
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  refreshAccessToken: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

// UI状态
interface UIStore {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  notifications: Notification[]
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  addNotification: (notification: Notification) => void
  removeNotification: (id: string) => void
}

// 全局加载状态
interface LoadingStore {
  loading: Record<string, boolean>
  setLoading: (key: string, loading: boolean) => void
  isLoading: (key: string) => boolean
}
```

### 4.2 React Query - 服务端状态

```typescript
// 查询配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5分钟
      cacheTime: 10 * 60 * 1000,       // 10分钟
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      onError: (error) => {
        // 全局错误处理
        toast.error(error.message)
      },
    },
  },
})

// 查询Key管理
export const queryKeys = {
  patients: {
    all: ['patients'] as const,
    lists: () => [...queryKeys.patients.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.patients.lists(), { filters }] as const,
    details: () => [...queryKeys.patients.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.patients.details(), id] as const,
  },
  // ... 其他资源的queryKeys
}
```

---

## 5. API集成层

### 5.1 Axios实例配置

```typescript
// src/api/client.ts
import axios from 'axios'
import { useAuthStore } from '@/features/auth/store/authStore'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加认证Token
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 处理Token刷新和错误
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config

    // 401错误且未重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const { refreshAccessToken } = useAuthStore.getState()
        await refreshAccessToken()

        // 重新发送原请求
        const { accessToken } = useAuthStore.getState()
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        // 刷新Token失败，退出登录
        const { logout } = useAuthStore.getState()
        logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
```

### 5.2 API服务示例

```typescript
// src/api/patient.api.ts
import apiClient from './client'
import type { Patient, CreatePatientDto, UpdatePatientDto } from '@/@types/models'

export const patientApi = {
  // 获取患者列表
  getPatients: (params?: {
    page?: number
    pageSize?: number
    name?: string
    gender?: string
    bloodType?: string
  }) => apiClient.get<{ data: Patient[]; total: number }>('/patients', { params }),

  // 获取患者详情
  getPatient: (id: string) => apiClient.get<{ data: Patient }>(`/patients/${id}`),

  // 创建患者
  createPatient: (data: CreatePatientDto) =>
    apiClient.post<{ data: Patient }>('/patients', data),

  // 更新患者
  updatePatient: (id: string, data: UpdatePatientDto) =>
    apiClient.put<{ data: Patient }>(`/patients/${id}`, data),

  // 删除患者
  deletePatient: (id: string) => apiClient.delete(`/patients/${id}`),

  // 获取患者统计
  getPatientStats: (id: string) =>
    apiClient.get<{ data: any }>(`/patients/${id}/statistics`),
}
```

---

## 6. 路由配置

### 6.1 路由结构

```typescript
// src/routes/routes.config.ts
import { RouteObject } from 'react-router-dom'
import { lazy } from 'react'

// 懒加载页面
const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const PatientManagement = lazy(() => import('@/pages/PatientManagement'))
const AppointmentManagement = lazy(() => import('@/pages/AppointmentManagement'))
const QueueDisplay = lazy(() => import('@/pages/QueueDisplay'))
const MedicineManagement = lazy(() => import('@/pages/MedicineManagement'))
const PrescriptionManagement = lazy(() => import('@/pages/PrescriptionManagement'))
const MedicalRecordManagement = lazy(() => import('@/pages/MedicalRecordManagement'))
const AIAssistant = lazy(() => import('@/pages/AIAssistant'))
const Statistics = lazy(() => import('@/pages/Statistics'))
const Settings = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <PrivateRoute><AppLayout /></PrivateRoute>,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'patients',
        element: <PatientManagement />,
      },
      {
        path: 'appointments',
        element: <AppointmentManagement />,
      },
      {
        path: 'queue',
        element: <QueueDisplay />,
      },
      {
        path: 'medicines',
        element: <MedicineManagement />,
      },
      {
        path: 'prescriptions',
        element: <PrescriptionManagement />,
      },
      {
        path: 'medical-records',
        element: <MedicalRecordManagement />,
      },
      {
        path: 'ai-assistant',
        element: <AIAssistant />,
      },
      {
        path: 'statistics',
        element: <Statistics />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]
```

### 6.2 权限守卫

```typescript
// src/routes/PrivateRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store/authStore'

interface PrivateRouteProps {
  children: React.ReactNode
  requiredPermission?: string
}

export function PrivateRoute({ children, requiredPermission }: PrivateRouteProps) {
  const { isAuthenticated, hasPermission } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
```

---

## 7. 组件开发规范

### 7.1 组件结构

```typescript
// 标准组件结构
import { FC } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn' // classnames合并工具

interface ComponentProps {
  // Props定义
  className?: string
  children?: React.ReactNode
}

export const Component: FC<ComponentProps> = ({
  className,
  children,
  ...props
}) => {
  // 1. Hooks
  // 2. 状态
  // 3. 副作用
  // 4. 事件处理
  // 5. 渲染

  return (
    <motion.div
      className={cn('base-styles', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
```

### 7.2 性能优化

```typescript
// 使用React.memo优化重渲染
export const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* 渲染逻辑 */}</div>
}, (prevProps, nextProps) => {
  // 自定义比较逻辑
  return prevProps.data.id === nextProps.data.id
})

// 使用useMemo优化计算
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data)
}, [data])

// 使用useCallback优化函数引用
const handleClick = useCallback(() => {
  doSomething(value)
}, [value])
```

---

## 8. 未来感UI组件示例

### 8.1 霓虹按钮

```typescript
// src/components/ui/Button.tsx
export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  return (
    <motion.button
      className={cn(
        // 基础样式
        'relative overflow-hidden rounded-lg font-semibold',
        'transition-all duration-300',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',

        // 霓虹效果
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-primary-500 before:to-accent-500',
        'before:opacity-0 hover:before:opacity-100',
        'before:transition-opacity before:duration-300',

        // 变体样式
        variant === 'primary' && [
          'bg-gradient-to-r from-primary-600 to-primary-500',
          'text-white shadow-neon-blue',
          'hover:shadow-neon-blue hover:scale-105',
        ],

        // 尺寸
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-base',
        size === 'lg' && 'px-6 py-3 text-lg',

        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}
```

### 8.2 未来感卡片

```typescript
// src/components/ui/Card.tsx
export const Card: FC<CardProps> = ({
  className,
  children,
  glowColor = 'blue',
  ...props
}) => {
  return (
    <motion.div
      className={cn(
        // 基础样式
        'relative rounded-xl border border-border-primary',
        'bg-gradient-to-br from-background-secondary to-background-tertiary',
        'backdrop-blur-sm',

        // 霓虹边框
        'before:absolute before:inset-0 before:rounded-xl',
        'before:bg-gradient-to-r before:from-primary-500/20 before:to-accent-500/20',
        'before:opacity-0 hover:before:opacity-100',
        'before:transition-opacity before:duration-500',

        // 光效
        glowColor === 'blue' && 'hover:shadow-neon-blue',
        glowColor === 'purple' && 'hover:shadow-neon-purple',
        glowColor === 'cyan' && 'hover:shadow-neon-cyan',

        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      {...props}
    >
      <div className="relative z-10 p-6">
        {children}
      </div>
    </motion.div>
  )
}
```

---

## 9. 开发流程

### 9.1 组件开发流程
1. 设计组件API（Props接口）
2. 实现基础结构和样式
3. 添加交互和动画
4. 编写单元测试
5. 编写Storybook文档（可选）
6. Code Review

### 9.2 功能模块开发流程
1. 定义API类型和接口
2. 实现API服务层
3. 创建React Query Hooks
4. 实现组件和页面
5. 添加路由配置
6. 集成测试
7. 优化性能

### 9.3 质量保证
- TypeScript严格模式
- ESLint代码检查
- Prettier代码格式化
- Vitest单元测试
- React Testing Library组件测试
- Chrome DevTools性能分析

---

## 10. 下一步行动

### 10.1 立即开始（优先级高）
1. ✅ 创建前端架构设计文档（当前文档）
2. 🔄 配置TailwindCSS未来感主题
3. 🔄 创建基础UI组件库
4. 🔄 实现认证模块和登录页面

### 10.2 后续开发（按里程碑）
- **里程碑1-2**: 登录界面 + 认证系统UI
- **里程碑3**: 患者管理界面 + AI智能问诊UI
- **里程碑4**: 挂号排队界面 + 实时叫号屏幕
- **里程碑5**: 药物医嘱界面 + AI用药审查UI
- **里程碑6**: 病历管理界面 + AI智能检索UI

### 10.3 最终验证
- Chrome MCP用户体验模拟测试
- 性能优化和动画调优
- 响应式设计验证
- 浏览器兼容性测试

---

**文档版本**: v1.0
**最后更新**: 2025-10-01
**作者**: 主Claude Code - AiliaoX奥创模式团队

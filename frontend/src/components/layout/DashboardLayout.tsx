/**
 * DashboardLayout 仪表盘布局组件 - 未来感赛博朋克风格
 */
import { useState, ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Calendar,
  Pill,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Menu,
  X,
  User,
  Activity,
  Bell,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/utils/cn'

interface SubMenuItem {
  name: string
  path: string
}

interface MenuItem {
  name: string
  path: string
  icon: React.ElementType
  subItems?: SubMenuItem[]
}

const menuItems: MenuItem[] = [
  { name: '患者管理', path: '/patients', icon: Users },
  {
    name: '挂号排队',
    path: '/appointments',
    icon: Calendar,
    subItems: [
      { name: '新建挂号', path: '/appointments' },
      { name: '挂号历史', path: '/appointments/history' },
      { name: '医生叫号', path: '/doctor/queue' },
    ],
  },
  { name: '药物医嘱', path: '/prescriptions', icon: Pill },
  { name: '病历管理', path: '/records', icon: FileText },
  { name: '系统公告', path: '/announcements', icon: Bell },
  { name: '系统监控', path: '/dashboard', icon: Activity },
]

interface DashboardLayoutProps {
  children: ReactNode
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/appointments'])
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleMenuExpansion = (path: string) => {
    setExpandedMenus(prev =>
      prev.includes(path)
        ? prev.filter(p => p !== path)
        : [...prev, path]
    )
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* 顶部导航栏 */}
      <header className="fixed top-0 left-0 right-0 h-16 glass-strong border-b border-border-subtle z-40">
        <div className="flex items-center justify-between h-full px-4">
          {/* Logo和菜单按钮 */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-text-primary hover:text-primary-400 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient hidden sm:inline">AiliaoX</span>
            </Link>
          </div>

          {/* 用户信息 */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 glass rounded-lg">
              <User className="w-5 h-5 text-primary-400" />
              <div>
                <p className="text-sm font-medium text-text-primary">{user?.name || user?.username}</p>
                <p className="text-xs text-text-tertiary">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 glass rounded-lg hover:bg-background-secondary/70 transition-colors group"
            >
              <LogOut className="w-5 h-5 text-text-tertiary group-hover:text-error-500 transition-colors" />
              <span className="text-sm text-text-primary hidden sm:inline">退出</span>
            </button>
          </div>
        </div>
      </header>

      {/* 侧边栏 - 桌面版 */}
      <aside
        className={cn(
          'fixed top-16 left-0 bottom-0 glass-strong border-r border-border-subtle z-30 transition-all duration-300 hidden lg:block',
          sidebarCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* 菜单项 */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path)
              const Icon = item.icon
              const hasSubItems = item.subItems && item.subItems.length > 0
              const isExpanded = expandedMenus.includes(item.path)

              return (
                <div key={item.path}>
                  {/* 主菜单项 */}
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden cursor-pointer',
                      isActive
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary/70'
                    )}
                    onClick={() => {
                      if (hasSubItems) {
                        toggleMenuExpansion(item.path)
                      } else {
                        navigate(item.path)
                      }
                    }}
                  >
                    {/* 霓虹发光效果 */}
                    {isActive && (
                      <motion.div
                        layoutId="activeMenu"
                        className="absolute inset-0 bg-gradient-to-r from-primary-500/30 to-secondary-500/30 rounded-lg"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    <Icon className={cn('w-5 h-5 relative z-10', isActive && 'text-primary-400')} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="font-medium relative z-10 flex-1">{item.name}</span>
                        {hasSubItems && (
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="relative z-10"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </motion.div>
                        )}
                      </>
                    )}

                    {/* 悬停霓虹效果 */}
                    <div
                      className={cn(
                        'absolute inset-0 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity',
                        isActive && 'opacity-0'
                      )}
                    />
                  </div>

                  {/* 子菜单项 */}
                  {hasSubItems && !sidebarCollapsed && (
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden ml-4 mt-1 space-y-1"
                        >
                          {item.subItems?.map((subItem) => {
                            const isSubActive = location.pathname === subItem.path
                            return (
                              <Link
                                key={subItem.path}
                                to={subItem.path}
                                className={cn(
                                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm relative',
                                  isSubActive
                                    ? 'bg-secondary-500/20 text-secondary-400'
                                    : 'text-text-tertiary hover:text-text-primary hover:bg-background-secondary/50'
                                )}
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                <span className="font-medium">{subItem.name}</span>
                              </Link>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              )
            })}
          </nav>

          {/* 折叠按钮 */}
          <div className="p-4 border-t border-border-subtle">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 glass rounded-lg hover:bg-background-secondary/70 transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-5 h-5 text-text-secondary" />
              ) : (
                <>
                  <ChevronLeft className="w-5 h-5 text-text-secondary" />
                  <span className="text-sm text-text-secondary">收起</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* 移动端侧边栏 */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* 菜单面板 */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed top-16 left-0 bottom-0 w-64 glass-strong border-r border-border-subtle z-50 lg:hidden"
            >
              <nav className="p-4 space-y-2">
                {menuItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path)
                  const Icon = item.icon
                  const hasSubItems = item.subItems && item.subItems.length > 0
                  const isExpanded = expandedMenus.includes(item.path)

                  return (
                    <div key={item.path}>
                      {/* 主菜单项 */}
                      <div
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer',
                          isActive
                            ? 'bg-primary-500/20 text-primary-400'
                            : 'text-text-secondary hover:text-text-primary hover:bg-background-secondary/70'
                        )}
                        onClick={() => {
                          if (hasSubItems) {
                            toggleMenuExpansion(item.path)
                          } else {
                            navigate(item.path)
                            setMobileMenuOpen(false)
                          }
                        }}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium flex-1">{item.name}</span>
                        {hasSubItems && (
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </motion.div>
                        )}
                      </div>

                      {/* 子菜单项 */}
                      {hasSubItems && (
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden ml-4 mt-1 space-y-1"
                            >
                              {item.subItems?.map((subItem) => {
                                const isSubActive = location.pathname === subItem.path
                                return (
                                  <Link
                                    key={subItem.path}
                                    to={subItem.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                      'flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm',
                                      isSubActive
                                        ? 'bg-secondary-500/20 text-secondary-400'
                                        : 'text-text-tertiary hover:text-text-primary hover:bg-background-secondary/50'
                                    )}
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                    <span className="font-medium">{subItem.name}</span>
                                  </Link>
                                )
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </div>
                  )
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 主内容区域 */}
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        )}
      >
        <div className="p-6">
          {/* 面包屑导航 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-text-tertiary">
              <Link to="/dashboard" className="hover:text-primary-400 transition-colors">
                首页
              </Link>
              <span>/</span>
              <span className="text-text-primary">
                {menuItems.find((item) => location.pathname.startsWith(item.path))?.name || '页面'}
              </span>
            </div>
          </div>

          {/* 页面内容 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  )
}

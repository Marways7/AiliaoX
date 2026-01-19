import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Brain,
  Layers,
  Shield,
  Sparkles,
  Cpu,
  Network,
  Lock
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import { getDashboardStatistics } from '../api/statistics.api'
import SceneContainer from '../components/landing/3d/SceneContainer'

const navItems = [
  { label: '系统定位', href: '#vision' },
  { label: '能力矩阵', href: '#capabilities' },
  { label: '应用场景', href: '#scenarios' },
  { label: '技术亮点', href: '#tech' },
]

const featureHighlights = [
  {
    title: '智慧运营中枢',
    description: '全院级数字孪生，打通挂号、分诊、床位、药事全链路。',
    icon: Layers,
    stats: '31+ 场景覆盖',
    colSpan: 'md:col-span-2',
  },
  {
    title: 'AI 临床协同',
    description: 'Diagnose+ 引擎辅助决策，0.8s 推理延时。',
    icon: Brain,
    stats: '98% 准确率',
    colSpan: 'md:col-span-1',
  },
  {
    title: '零信任安全',
    description: '国密算法 & 动态密钥轮转，等保三级合规。',
    icon: Shield,
    stats: '金融级防护',
    colSpan: 'md:col-span-1',
  },
  {
    title: '科研数据闭环',
    description: '结构化病例自动脱敏，一键进入科研沙箱。',
    icon: DatabaseIcon,
    stats: '5倍 效率提升',
    colSpan: 'md:col-span-2',
  },
]

// Helper icon component
function DatabaseIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export function LandingPage() {
  const { isAuthenticated } = useAuthStore()
  const primaryCtaHref = isAuthenticated ? '/dashboard' : '/login'
  
  // Data fetching (simplified for brevity, logic remains same)
  const { data: dashboardStats } = useQuery({
    queryKey: ['landing-dashboard'],
    queryFn: getDashboardStatistics,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  })

  const heroMetrics = useMemo(() => {
      if (dashboardStats) {
        // Use real data
        return [
            { label: 'LIVE PATIENTS', value: dashboardStats.patients.total.toLocaleString(), unit: 'Active' },
            { label: 'AI PROCESSED', value: dashboardStats.medicalRecords.withAICount.toLocaleString(), unit: 'Records' },
            { label: 'SYSTEM LOAD', value: 'Low', unit: 'Stable' }
        ]
      }
      return [
        { label: 'LIVE NODES', value: '128+', unit: 'Connected' },
        { label: 'AI LATENCY', value: '42ms', unit: 'Inferencing' },
        { label: 'SECURITY', value: 'L3', unit: 'Certified' },
      ]
  }, [dashboardStats])

  return (
    <div className="relative min-h-screen bg-obsidian text-white selection:bg-cyan-ray/30">
      {/* 3D Background Layer */}
      <div className="fixed inset-0 z-0">
        <SceneContainer />
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian/20 via-obsidian/60 to-obsidian pointer-events-none" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-obsidian/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-cyan-ray/20 flex items-center justify-center border border-cyan-ray/50">
                <Activity className="h-5 w-5 text-cyan-ray" />
            </div>
            <span className="text-lg font-bold tracking-widest text-white">AILIAOX</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            {navItems.map(item => (
                <a key={item.label} href={item.href} className="hover:text-cyan-ray transition-colors uppercase tracking-wider text-xs">
                    {item.label}
                </a>
            ))}
          </div>

          <Link
            to={primaryCtaHref}
            className="group relative overflow-hidden rounded-full bg-white/10 px-6 py-2 text-sm font-medium text-white backdrop-blur hover:bg-cyan-ray hover:text-obsidian transition-all duration-300"
          >
            <span className="relative z-10 flex items-center gap-2">
                {isAuthenticated ? 'ENTER CONSOLE' : 'ACCESS SYSTEM'}
                <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-20">
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeInUp} 
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-ray/30 bg-cyan-ray/5 px-3 py-1 text-xs font-medium text-cyan-ray backdrop-blur mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-ray opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-ray"></span>
                </span>
                SYSTEM ONLINE v2.0.4
            </div>
            
            <h1 className="text-5xl md:text-7xl font-light tracking-tight text-white mb-6 leading-[1.1]">
              The Future of <br />
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">Medical OS</span>
            </h1>
            
            <p className="text-lg text-white/60 mb-10 max-w-lg font-light leading-relaxed">
              AiliaoX 重新定义智慧医院。
              <br />
              融合 AI Agent、实时数据流与全息可视化，为医疗机构构建 SOTA 级数字神经中枢。
            </p>
            
            <div className="flex flex-wrap gap-4">
                <Link 
                    to={primaryCtaHref}
                    className="relative px-8 py-4 bg-cyan-ray text-obsidian-900 font-bold tracking-wide rounded-lg overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative flex items-center gap-2">
                        INITIALIZE
                        <ArrowUpRight className="h-4 w-4" />
                    </span>
                </Link>
                <a 
                    href="#vision"
                    className="px-8 py-4 border border-white/20 text-white font-medium tracking-wide rounded-lg hover:bg-white/5 transition-colors"
                >
                    EXPLORE
                </a>
            </div>

            {/* Hero Metrics */}
            <div className="mt-16 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
                {heroMetrics.map((m) => (
                    <div key={m.label}>
                        <p className="text-2xl font-light text-white">{m.value}</p>
                        <p className="text-[10px] uppercase tracking-widest text-cyan-ray/60 mt-1">{m.label}</p>
                    </div>
                ))}
            </div>
          </motion.div>

          {/* Right side is empty to show 3D Brain */}
          <div className="hidden lg:block relative h-full">
              {/* Floating Glass Cards (HUD) */}
              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="absolute top-20 right-0 w-72 bg-obsidian/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-glow-lg"
              >
                  <div className="flex justify-between items-center mb-4">
                      <span className="text-xs text-cyan-ray uppercase tracking-wider">AI Diagnostics</span>
                      <Brain className="h-4 w-4 text-cyan-ray" />
                  </div>
                  <div className="space-y-3">
                      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-ray w-[85%] shadow-[0_0_10px_#00F0FF]" />
                      </div>
                      <div className="flex justify-between text-xs text-white/50">
                          <span>Accuracy</span>
                          <span className="text-white">98.5%</span>
                      </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="bg-white/5 p-2 rounded border border-white/5">
                          <div className="text-[10px] text-white/40">Lat</div>
                          <div className="text-sm text-cyan-ray">12ms</div>
                      </div>
                      <div className="bg-white/5 p-2 rounded border border-white/5">
                          <div className="text-[10px] text-white/40">QPS</div>
                          <div className="text-sm text-cyan-ray">2.4k</div>
                      </div>
                  </div>
              </motion.div>
          </div>
        </section>

        {/* Features - Bento Grid */}
        <section id="vision" className="mx-auto max-w-7xl px-6 lg:px-8 py-32">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-16"
            >
                <h2 className="text-3xl md:text-4xl font-light text-white mb-4">Core Architecture</h2>
                <p className="text-white/50 max-w-2xl text-lg">
                    基于微服务与事件驱动的模块化架构，为您提供即插即用的医疗数字化能力。
                </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featureHighlights.map((feature, idx) => (
                    <motion.div
                        key={feature.title}
                        className={`group relative overflow-hidden rounded-3xl bg-white/5 border border-white/5 p-8 hover:border-cyan-ray/30 transition-colors duration-500 ${feature.colSpan}`}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-ray/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative z-10">
                            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-ray/10 text-cyan-ray group-hover:scale-110 transition-transform duration-300">
                                <feature.icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-3">{feature.title}</h3>
                            <p className="text-white/60 mb-6">{feature.description}</p>
                            
                            <div className="flex items-center gap-2 text-xs font-medium text-cyan-ray tracking-widest uppercase">
                                <Sparkles className="h-3 w-3" />
                                {feature.stats}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>

        {/* Tech Stack - Scrolling or Grid */}
        <section id="tech" className="relative py-32 border-t border-white/5 bg-obsidian/80">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-light text-white mb-6">Innovation Stack</h2>
                        <div className="space-y-8">
                            {[
                                { icon: Cpu, title: 'Edge Computing', desc: '本地化边缘节点处理，数据不出院区。' },
                                { icon: Network, title: 'Real-time Mesh', desc: 'WebSocket + gRPC 双通道实时通讯网络。' },
                                { icon: Lock, title: 'Zero-Trust Core', desc: '基于身份的动态访问控制策略。' }
                            ].map((item) => (
                                <div key={item.title} className="flex gap-4">
                                    <div className="mt-1 h-10 w-10 shrink-0 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                                        <item.icon className="h-5 w-5 text-white/70" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-medium text-white">{item.title}</h4>
                                        <p className="text-white/50">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative h-[500px] rounded-3xl overflow-hidden border border-white/10 bg-black/40">
                        {/* Decorative Code/Tech UI */}
                        <div className="absolute inset-0 p-6 font-mono text-xs text-cyan-ray/50 opacity-50">
                            <div className="flex gap-2 mb-4 border-b border-white/10 pb-4">
                                <div className="h-3 w-3 rounded-full bg-red-500/50" />
                                <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                                <div className="h-3 w-3 rounded-full bg-green-500/50" />
                            </div>
                            <p>{`> initiating system sequence...`}</p>
                            <p>{`> loading neural_core_v2.module`}</p>
                            <p className="text-cyan-ray">{`> connection established: secure`}</p>
                            <p>{`> analyzing metrics...`}</p>
                            {Array.from({ length: 10 }).map((_, i) => (
                                <p key={i} className="mt-2">{`[${Date.now() + i * 100}] DATA_PACKET_RECEIVED: { id: "0x${i}F", status: "OK" }`}</p>
                            ))}
                        </div>
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent" />
                    </div>
                </div>
            </div>
        </section>

        {/* CTA */}
        <section className="py-32 relative overflow-hidden">
             <div className="absolute inset-0 bg-cyan-ray/5" />
             <div className="mx-auto max-w-4xl text-center px-6 relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
                    Ready to Upgrade?
                </h2>
                <p className="text-xl text-white/60 mb-10">
                    立即接入 AiliaoX，开启智能化医疗管理新纪元。
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link
                        to={primaryCtaHref}
                        className="px-10 py-4 bg-white text-obsidian font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                    >
                        Start Now
                    </Link>
                    <a
                        href="mailto:contact@ailiaox.com"
                        className="px-10 py-4 border border-white/20 text-white rounded-full hover:bg-white/10 transition-colors"
                    >
                        Contact Sales
                    </a>
                </div>
             </div>
        </section>
      </main>
    </div>
  )
}

export default LandingPage

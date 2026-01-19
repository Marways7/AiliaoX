# AiliaoX - AI驱动的医院信息系统

<div align="center">

**🏥 智能医疗 | 🤖 AI驱动 | 🌐 MCP协议 | 🎯 自然语言操作**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933.svg)](https://nodejs.org/)

</div>

---

## 🌟 项目概述

AiliaoX是一个革命性的AI驱动医院信息系统（HIS），通过**Model Context Protocol (MCP)**和多AI模型支持，实现自然语言与数据库的无缝交互，让医护人员能够通过对话完成所有信息管理任务。

### 核心特性

- 🤖 **MCP驱动的自然语言数据库操作** - 通过对话完成所有CRUD操作
- 🧠 **多AI模型支持** - DeepSeek、Gemini、Kimi、OpenAI可自由切换
- 🎤 **语音交互能力** - 语音输入输出，解放双手
- ⚡ **实时通信** - WebSocket实时叫号和消息推送
- 🔒 **医疗级安全** - HIPAA/GDPR合规，敏感数据加密
- 📊 **智能数据分析** - AI自动生成报表、趋势预测、异常检测
- 🩺 **AI智能辅助** - 诊疗建议、用药提醒、病历摘要、风险评估

---

## 🏗️ 技术架构

### 技术栈

**前端**
- React 18 + TypeScript 5.0+
- Vite 5.0+ 构建工具
- TailwindCSS 3.0+ + Framer Motion
- Zustand + React Query 状态管理
- Socket.io WebSocket客户端

**后端**
- Node.js 20+ + TypeScript 5.0+
- Express 4.18+ 框架
- Prisma 5.0+ ORM
- MySQL 8.0+ + Redis 缓存
- Socket.io WebSocket服务器

**AI集成**
- 标准MCP Client实现
- MySQL MCP Server
- DeepSeek / Gemini / Kimi / OpenAI SDK
- Web Speech API + 语音识别服务

**部署**
- Docker + Docker Compose
- GitHub Actions CI/CD
- Prometheus + Grafana 监控

---

## 📦 快速开始

### 前置要求

- Node.js 20+
- MySQL 8.0+
- Redis 7+
- Docker & Docker Compose (推荐)

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/marways7/ailiaox.git
cd ailiaox
```

#### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和AI API密钥
```

#### 3. 使用Docker启动（推荐）

```bash
docker-compose up -d
```

#### 4. 手动启动

```bash
# 安装依赖
npm run install:all

# 启动MySQL和Redis（确保已运行）

# 数据库迁移
cd backend
npm run prisma:migrate

# 启动开发服务器
npm run dev
```

#### 5. 一键快速启动（详见QUICK_START.md）
```bash
npm start
```
访问: http://localhost:5173

---

## 📚 项目文档

- [需求规格说明书](./docs/Requirements-Specification.md)
- [系统架构设计](./docs/System-Architecture.md)
- [Prisma数据库Schema](./docs/prisma-schema-design.prisma)
- [API文档](./docs/API.md)
- [开发指南](./docs/Development-Guide.md)
- [部署文档](./docs/Deployment.md)

---

## 🗂️ 项目结构

```
ailiaox/
├── frontend/              # React前端项目
│   ├── src/
│   │   ├── components/   # React组件
│   │   ├── pages/        # 页面
│   │   ├── services/     # API服务
│   │   ├── mcp/          # MCP Client
│   │   └── ai/           # AI Provider
│   └── package.json
├── backend/              # Express后端项目
│   ├── src/
│   │   ├── routes/       # API路由
│   │   ├── controllers/  # 控制器
│   │   ├── services/     # 业务服务
│   │   ├── mcp/          # MCP Client实现
│   │   ├── ai/           # AI Provider实现
│   │   └── prisma/       # Prisma配置
│   └── package.json
├── shared/               # 共享代码（类型定义等）
├── docker/               # Docker配置
├── docs/                 # 项目文档
└── docker-compose.yml    # Docker编排配置
```

---

## 🎯 开发里程碑

- ✅ **里程碑0**: 需求分析和架构设计
- 🔄 **里程碑1**: 项目基础架构与MCP集成
- ⏳ **里程碑2**: 用户认证与权限系统
- ⏳ **里程碑3**: 患者信息管理与AI交互
- ⏳ **里程碑4**: 智能排队叫号与挂号系统
- ⏳ **里程碑5**: 药物医嘱管理与智能辅助
- ⏳ **里程碑6**: 病历管理与智能检索
- ⏳ **里程碑7**: 智能统计报表与系统公告

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

### 开发流程

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给我们一个Star！⭐**

Made with ❤️ by AiliaoX Team

</div>
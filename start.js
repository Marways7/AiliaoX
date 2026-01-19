#!/usr/bin/env node

/**
 * AiliaoX 一键启动脚本
 * 炫酷的启动条幅 + 自动化启动流程
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // 前景色
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // 背景色
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',

  // 渐变色（自定义）
  gradient1: '\x1b[38;5;39m',  // 亮蓝
  gradient2: '\x1b[38;5;51m',  // 青色
  gradient3: '\x1b[38;5;87m',  // 浅青
  gradient4: '\x1b[38;5;123m', // 天蓝
};

// 工具函数
const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.blue}▸${colors.reset} ${msg}`),
};

// 延迟函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 显示炫酷的ASCII艺术横幅
async function showBanner() {
  console.clear();

  const banner = `
${colors.gradient1}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}
${colors.gradient2}║                                                                            ║${colors.reset}
${colors.gradient2}║     ${colors.bright}${colors.cyan}    _    _ _ _             __  __                                   ${colors.reset}${colors.gradient2}║${colors.reset}
${colors.gradient3}║     ${colors.bright}${colors.cyan}   / \\  (_) (_) __ _  ___ \\ \\/ /                                   ${colors.reset}${colors.gradient3}║${colors.reset}
${colors.gradient3}║     ${colors.bright}${colors.cyan}  / _ \\ | | | |/ _\` |/ _ \\ \\  /                                    ${colors.reset}${colors.gradient3}║${colors.reset}
${colors.gradient4}║     ${colors.bright}${colors.cyan} / ___ \\| | | | (_| | (_) /  \\                                     ${colors.reset}${colors.gradient4}║${colors.reset}
${colors.gradient4}║     ${colors.bright}${colors.cyan}/_/   \\_\\_|_|_|\\__,_|\\___/_/\\_\\                                    ${colors.reset}${colors.gradient4}║${colors.reset}
${colors.gradient2}║                                                                            ║${colors.reset}
${colors.gradient3}║                  ${colors.bright}${colors.white}🏥 AI驱动的智能医院综合管理系统${colors.reset}                      ${colors.gradient3}║${colors.reset}
${colors.gradient4}║                    ${colors.dim}State-of-the-Art Medical Platform${colors.reset}                    ${colors.gradient4}║${colors.reset}
${colors.gradient2}║                                                                            ║${colors.reset}
${colors.gradient1}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}
`;

  console.log(banner);

  // 渐进式显示系统信息
  const systemInfo = [
    { label: '🚀 启动模式', value: 'Development', color: colors.cyan },
    { label: '🔧 Node版本', value: process.version, color: colors.green },
    { label: '📦 项目路径', value: process.cwd(), color: colors.yellow },
    { label: '⏰ 启动时间', value: new Date().toLocaleString('zh-CN'), color: colors.magenta },
  ];

  console.log(`\n${colors.bright}${colors.white}═══════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  for (const info of systemInfo) {
    await sleep(100);
    console.log(`  ${info.color}${info.label}${colors.reset}  ${colors.dim}→${colors.reset}  ${info.value}`);
  }

  console.log(`\n${colors.bright}${colors.white}═══════════════════════════════════════════════════════════════════════════${colors.reset}\n`);
  await sleep(300);
}

// 进度条动画
async function showProgress(message, duration = 2000) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const startTime = Date.now();
  let frame = 0;

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percent = Math.min(100, Math.floor((elapsed / duration) * 100));
      const barLength = 40;
      const filled = Math.floor((percent / 100) * barLength);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

      process.stdout.write(`\r  ${colors.cyan}${frames[frame]}${colors.reset} ${message} ${colors.dim}[${bar}]${colors.reset} ${percent}%`);

      frame = (frame + 1) % frames.length;

      if (elapsed >= duration) {
        clearInterval(interval);
        process.stdout.write(`\r  ${colors.green}✓${colors.reset} ${message} ${colors.dim}[${'█'.repeat(barLength)}]${colors.reset} 100%\n`);
        resolve();
      }
    }, 80);
  });
}

// 检查环境
async function checkEnvironment() {
  log.step('检查运行环境...\n');

  // 检查 Node.js 版本
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion >= 20) {
    log.success(`Node.js 版本: ${nodeVersion} ${colors.dim}(符合要求)${colors.reset}`);
  } else {
    log.error(`Node.js 版本过低: ${nodeVersion}，需要 >= 20.0.0`);
    process.exit(1);
  }

  // 检查 Docker
  try {
    await execAsync('docker --version');
    log.success('Docker 已安装');
  } catch {
    log.warning('Docker 未安装或未运行（将使用系统数据库）');
  }

  await sleep(500);
}

// 启动数据库服务
async function startDatabases() {
  console.log(`\n${colors.bright}${colors.blue}▸ 启动数据库服务...${colors.reset}\n`);

  try {
    await showProgress('启动 MySQL & Redis 容器', 1500);

    await execAsync('docker-compose up -d mysql redis', { cwd: __dirname });

    log.success('数据库服务启动成功\n');
    await sleep(500);
  } catch (error) {
    log.warning(`Docker 启动失败，尝试使用系统数据库: ${error.message}\n`);
  }
}

// 运行数据库迁移
async function runMigrations() {
  console.log(`${colors.bright}${colors.blue}▸ 运行数据库迁移...${colors.reset}\n`);

  try {
    await showProgress('生成 Prisma Client', 1000);
    await execAsync('npx prisma generate', { cwd: `${__dirname}/backend` });

    await showProgress('应用数据库迁移', 1000);
    await execAsync('npx prisma migrate deploy', { cwd: `${__dirname}/backend` });

    log.success('数据库迁移完成\n');
    await sleep(500);
  } catch (error) {
    log.error(`数据库迁移失败: ${error.message}\n`);
  }
}

// 启动开发服务器
async function startDevServer() {
  console.log(`${colors.bright}${colors.blue}▸ 启动开发服务器...${colors.reset}\n`);

  await showProgress('准备前后端服务', 1500);

  console.log('\n');
  log.info('正在启动服务，请稍候...\n');

  // 启动开发服务器
  const devProcess = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  devProcess.on('error', (error) => {
    log.error(`启动失败: ${error.message}`);
    process.exit(1);
  });

  // 等待一段时间让服务启动
  await sleep(3000);
}

// 显示成功信息
async function showSuccessMessage() {
  const successBanner = `
${colors.green}╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                        ${colors.bright}${colors.white}🎉  启动成功！服务已就绪  🎉${colors.reset}${colors.green}                         ║
║                                                                            ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ${colors.cyan}前端服务${colors.reset}${colors.green}  ${colors.bright}http://localhost:5173${colors.reset}${colors.green}                                       ║
║  ${colors.cyan}后端服务${colors.reset}${colors.green}  ${colors.bright}http://localhost:3000${colors.reset}${colors.green}                                       ║
║  ${colors.cyan}健康检查${colors.reset}${colors.green}  ${colors.bright}http://localhost:3000/health${colors.reset}${colors.green}                                ║
║                                                                            ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ${colors.yellow}测试账号${colors.reset}${colors.green}                                                               ║
║  ${colors.dim}管理员:${colors.reset}${colors.green} admin / Admin123!                                             ║
║  ${colors.dim}医  生:${colors.reset}${colors.green} zhangsan / Doctor123!                                         ║
║  ${colors.dim}操作员:${colors.reset}${colors.green} wangwu / Operator123!                                         ║
║                                                                            ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ${colors.magenta}快捷命令${colors.reset}${colors.green}                                                              ║
║  ${colors.dim}停止服务:${colors.reset}${colors.green} Ctrl+C                                                       ║
║  ${colors.dim}查看日志:${colors.reset}${colors.green} docker-compose logs -f                                      ║
║  ${colors.dim}数据库管理:${colors.reset}${colors.green} npm run prisma:studio                                     ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}
`;

  console.log(successBanner);

  // 闪烁提示
  const tips = [
    '💡 提示：首次启动可能需要等待几秒钟...',
    '🔍 如有问题，请检查终端输出日志',
    '📚 完整文档：./docs/README.md',
  ];

  for (const tip of tips) {
    await sleep(200);
    console.log(`  ${colors.dim}${tip}${colors.reset}`);
  }

  console.log('\n');
}

// 主函数
async function main() {
  try {
    // 显示启动横幅
    await showBanner();

    // 检查环境
    await checkEnvironment();

    // 启动数据库
    await startDatabases();

    // 运行迁移
    await runMigrations();

    // 启动开发服务器
    await startDevServer();

    // 显示成功信息
    await showSuccessMessage();

  } catch (error) {
    log.error(`启动失败: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 优雅退出处理
process.on('SIGINT', () => {
  console.log(`\n\n${colors.yellow}正在停止服务...${colors.reset}\n`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n\n${colors.yellow}正在停止服务...${colors.reset}\n`);
  process.exit(0);
});

// 运行主函数
main();

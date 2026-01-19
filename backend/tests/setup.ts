/**
 * Jest 测试设置文件
 */

// 设置环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // 测试时减少日志输出

// 模拟console方法，减少测试输出
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // 保留error输出，便于调试
  error: console.error,
};

// 设置全局超时
jest.setTimeout(10000);

// 清理函数
afterAll(() => {
  // 清理所有定时器
  jest.clearAllTimers();
});
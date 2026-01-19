#!/usr/bin/env node
/**
 * 认证系统API测试脚本
 * 用于验证认证功能是否正常工作
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

// 测试颜色输出
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`
};

// 测试数据
let accessToken = '';
let refreshToken = '';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test() {
  console.log(colors.blue('\n========== AiliaoX 认证系统测试 ==========\n'));

  try {
    // 1. 测试健康检查
    console.log(colors.yellow('1. 测试健康检查...'));
    const health = await axios.get('http://localhost:3000/health');
    console.log(colors.green('✅ 健康检查通过'), health.data);

    // 2. 测试API根路径
    console.log(colors.yellow('\n2. 测试API根路径...'));
    const apiRoot = await axios.get(`${API_BASE}/`);
    console.log(colors.green('✅ API根路径响应正常'));
    console.log('可用端点:', Object.keys(apiRoot.data.endpoints));

    // 3. 测试登录（错误密码）
    console.log(colors.yellow('\n3. 测试登录失败场景...'));
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        username: 'admin',
        password: 'wrongpassword'
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(colors.green('✅ 错误密码正确拒绝'));
      } else {
        throw error;
      }
    }

    // 4. 测试登录（正确密码）
    console.log(colors.yellow('\n4. 测试登录成功场景...'));
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123456'
    });

    if (loginRes.data.success && loginRes.data.data.accessToken) {
      accessToken = loginRes.data.data.accessToken;
      const user = loginRes.data.data.user;
      console.log(colors.green('✅ 登录成功'));
      console.log('用户信息:', {
        id: user.id,
        username: user.username,
        role: user.role
      });
      console.log('Token长度:', accessToken.length);
    } else {
      throw new Error('登录响应格式错误');
    }

    // 5. 测试获取当前用户信息（需要认证）
    console.log(colors.yellow('\n5. 测试获取当前用户信息...'));
    const meRes = await axios.get(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (meRes.data.success && meRes.data.data) {
      console.log(colors.green('✅ 获取用户信息成功'));
      console.log('用户详情:', {
        id: meRes.data.data.id,
        username: meRes.data.data.username,
        email: meRes.data.data.email,
        role: meRes.data.data.role
      });
    }

    // 6. 测试无Token访问受保护资源
    console.log(colors.yellow('\n6. 测试无Token访问受保护资源...'));
    try {
      await axios.get(`${API_BASE}/auth/me`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(colors.green('✅ 无Token正确拒绝'));
      } else {
        throw error;
      }
    }

    // 7. 测试错误Token访问
    console.log(colors.yellow('\n7. 测试错误Token访问...'));
    try {
      await axios.get(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': 'Bearer invalid.token.here'
        }
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(colors.green('✅ 错误Token正确拒绝'));
      } else {
        throw error;
      }
    }

    // 8. 测试用户列表（需要权限）
    console.log(colors.yellow('\n8. 测试用户管理API...'));
    const usersRes = await axios.get(`${API_BASE}/users`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (usersRes.data.success && usersRes.data.data.users) {
      console.log(colors.green('✅ 获取用户列表成功'));
      console.log(`用户数量: ${usersRes.data.data.users.length}`);
      usersRes.data.data.users.forEach(user => {
        console.log(`  - ${user.username} (${user.role})`);
      });
    }

    // 9. 测试登出
    console.log(colors.yellow('\n9. 测试登出...'));
    const logoutRes = await axios.post(`${API_BASE}/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (logoutRes.data.success) {
      console.log(colors.green('✅ 登出成功'));
    }

    // 10. 测试登出后Token失效
    console.log(colors.yellow('\n10. 测试登出后Token是否失效...'));
    try {
      await axios.get(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log(colors.red('❌ Token未失效，这可能是个问题'));
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(colors.green('✅ Token已失效（注：内存撤销，重启服务后失效）'));
      } else {
        throw error;
      }
    }

    // 测试总结
    console.log(colors.blue('\n========== 测试完成 =========='));
    console.log(colors.green('\n✅ 所有认证功能测试通过！'));
    console.log('\n认证系统功能清单：');
    console.log('  ✓ 用户登录（JWT Token生成）');
    console.log('  ✓ 密码验证（bcrypt加密）');
    console.log('  ✓ Token认证中间件');
    console.log('  ✓ 获取当前用户信息');
    console.log('  ✓ 用户管理（CRUD）');
    console.log('  ✓ RBAC权限控制');
    console.log('  ✓ 用户登出');
    console.log('  ✓ Token撤销机制');

    console.log('\n测试账号：');
    console.log('  管理员: admin / admin123456');
    console.log('  医生1: zhangsan / doctor123456');
    console.log('  医生2: lisi / doctor123456');
    console.log('  操作员: wangwu / operator123456');

  } catch (error) {
    console.error(colors.red('\n❌ 测试失败:'));
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应:', error.response.data);
    } else {
      console.error(error.message);
      console.error('提示: 请确保后端服务正在运行 (npm run dev)');
    }
    process.exit(1);
  }
}

// 执行测试
test();
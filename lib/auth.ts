import { NextRequest } from 'next/server';

// 简单的JWT实现（用于演示）
const SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'vehicle_management_secret';

// 生成简单的token（实际项目中应该使用正式的JWT库）
export function generateToken(username: string): string {
  const payload = {
    username,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24小时过期
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// 验证token
export function verifyToken(token: string): { valid: boolean; username?: string } {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    
    // 检查是否过期
    if (payload.exp < Date.now()) {
      return { valid: false };
    }
    
    return { valid: true, username: payload.username };
  } catch (error) {
    return { valid: false };
  }
}

// 验证管理员凭据
export function verifyCredentials(username: string, password: string): boolean {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  return username === adminUsername && password === adminPassword;
}

// 验证API密钥
export function verifyApiKey(apiKey: string): boolean {
  const serverApiKey = process.env.API_KEY;
  // 如果没有设置API_KEY，则不需要验证
  if (!serverApiKey) return true;
  return apiKey === serverApiKey;
}

// 中间件：检查是否已认证（支持token和API key两种方式）
export function isAuthenticated(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  
  // 如果没有认证头，则未认证
  if (!authHeader) {
    return false;
  }
  
  // 支持两种认证方式：
  // 1. Bearer Token（管理员登录token）
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    const { valid } = verifyToken(token);
    if (valid) {
      return true;
    }
    
    // 2. API Key（直接使用API_KEY）
    const apiKey = authHeader.substring(7); // 移除 "Bearer " 前缀
    return verifyApiKey(apiKey);
  }
  
  return false;
}

// API路由中间件：检查认证状态
export function withAuth(handler: Function) {
  return async (request: NextRequest, context: any) => {
    if (!isAuthenticated(request)) {
      return new Response(
        JSON.stringify({ error: '未授权访问' }), 
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return handler(request, context);
  };
}
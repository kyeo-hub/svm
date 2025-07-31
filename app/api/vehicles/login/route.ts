import { NextRequest } from 'next/server';
import { verifyCredentials, generateToken } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // 验证凭据
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: '用户名和密码不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (verifyCredentials(username, password)) {
      // 生成token
      const token = generateToken(username);
      
      return new Response(
        JSON.stringify({ 
          message: '登录成功',
          token,
          username 
        }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
          } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: '用户名或密码错误' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('登录错误:', error);
    return new Response(
      JSON.stringify({ error: '服务器内部错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
import { NextRequest } from 'next/server';
import { addClient, removeClient } from '../../../lib/eventBroadcast';

// 强制动态渲染，防止构建时预渲染导致超时
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 设置SSE响应头
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  };

  // 创建一个新的响应流
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // 发送初始连接消息
  writer.write(encoder.encode('data: connected\n\n'));

  // 添加客户端到广播列表
  addClient(writer);

  // 处理客户端断开连接
  request.signal.addEventListener('abort', () => {
    removeClient(writer);
    writer.close();
  });

  // 每30秒发送一次心跳
  const interval = setInterval(() => {
    writer.write(encoder.encode('data: heartbeat\n\n'));
  }, 30000);

  // 清理定时器
  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
  });

  return new Response(stream.readable, { headers });
}
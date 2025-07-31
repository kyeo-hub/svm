import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    // 读取地图配置文件
    const configPath = join(process.cwd(), 'data', 'mapConfig.json');
    const configFile = await readFile(configPath, 'utf8');
    const config = JSON.parse(configFile);
    
    return new Response(JSON.stringify(config), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('读取地图配置文件失败:', error);
    return new Response(JSON.stringify({ error: '无法读取地图配置文件' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
import { NextRequest } from 'next/server';
import { VehicleService } from '../../../lib/vehicleService';
import { setupDatabase } from '../../../db/database';

export async function POST(request: NextRequest) {
  try {
    // 检查API密钥（仅在设置了API_KEY环境变量时才进行验证）
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.API_KEY || 'default-key';
    
    if (process.env.API_KEY && (!authHeader || authHeader !== `Bearer ${apiKey}`)) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // 初始化数据库表
    await setupDatabase();
    
    // 初始化默认车辆
    await VehicleService.initializeDefaultVehicles();
    
    return new Response(JSON.stringify({ message: '数据库和默认车辆数据初始化成功' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('初始化过程中出错:', error);
    return new Response(JSON.stringify({ error: '初始化失败: ' + (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
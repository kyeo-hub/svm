import { NextRequest } from 'next/server';
import { VehicleService } from '../../../lib/vehicleService';
import { isAuthenticated } from '../../../lib/auth';

// 获取所有车辆
export async function GET(request: NextRequest) {
  // 允许公开访问车辆列表，以便主页和统计页面可以正常显示
  // 管理操作（创建、更新、删除）仍然需要认证

  try {
    const vehicles = await VehicleService.getAllVehicles();
    return new Response(JSON.stringify(vehicles), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('获取车辆列表失败:', error);
    return new Response(JSON.stringify({ error: '获取车辆列表失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 创建新车辆
export async function POST(request: NextRequest) {
  // 检查认证状态 - 创建车辆需要认证
  if (!isAuthenticated(request)) {
    return new Response(
      JSON.stringify({ error: '未授权访问' }), 
      { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const body = await request.json();
    
    // 简单的API密钥验证
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.API_KEY;
    
    // 仅在设置了API_KEY环境变量时才进行验证
    if (apiKey && (!authHeader || authHeader !== `Bearer ${apiKey}`)) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const { vehicle_id, name, status, location_x, location_y } = body;
    
    if (!vehicle_id || !name || !status) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 创建车辆
    const vehicle = await VehicleService.updateVehicleStatus(
      vehicle_id,
      name,
      status,
      location_x,
      location_y
    );
    
    return new Response(JSON.stringify(vehicle), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('创建车辆失败:', error);
    return new Response(JSON.stringify({ error: '创建车辆失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
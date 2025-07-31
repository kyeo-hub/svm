import { NextRequest } from 'next/server';
import { VehicleService } from '../../../lib/vehicleService';

// 获取所有车辆
export async function GET() {
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
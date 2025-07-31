import { NextRequest } from 'next/server';
import { VehicleService } from '../../../../lib/vehicleService';
import { isAuthenticated } from '../../../../lib/auth';

// 根据ID获取单个车辆
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const vehicle = await VehicleService.getVehicleById(params.id);
    
    if (!vehicle) {
      return new Response(JSON.stringify({ error: '车辆未找到' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify(vehicle), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('获取车辆失败:', error);
    return new Response(JSON.stringify({ error: '获取车辆失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 更新车辆信息
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // 检查认证状态
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
    
    // 更新车辆
    const vehicle = await VehicleService.updateVehicleStatus(
      vehicle_id,
      name,
      status,
      location_x,
      location_y
    );
    
    return new Response(JSON.stringify(vehicle), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('更新车辆失败:', error);
    return new Response(JSON.stringify({ error: '更新车辆失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 删除车辆
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  // 检查认证状态
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
    // 简单的API密钥验证
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.API_KEY;
    
    // 仅在设置了API_KEY环境变量时才进行验证
    if (apiKey && (!authHeader || authHeader !== `Bearer ${apiKey}`)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 从URL参数中获取 vehicle_id
    const vehicle_id = params.id;

    if (!vehicle_id) {
      return new Response(JSON.stringify({ error: '缺少必要参数: vehicle_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 删除车辆及其相关数据
    const deletedVehicle = await VehicleService.deleteVehicle(vehicle_id);
    
    if (!deletedVehicle) {
      return new Response(JSON.stringify({ error: '车辆未找到' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      message: '车辆删除成功',
      deletedVehicle: deletedVehicle
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('删除车辆失败:', error);
    return new Response(JSON.stringify({ error: '删除车辆失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
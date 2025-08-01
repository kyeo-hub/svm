import { NextRequest } from 'next/server';
import { VehicleService } from '../../../lib/vehicleService';
import { Pool } from 'pg';
import { isAuthenticated } from '../../../lib/auth';

// 强制动态渲染，防止构建时预渲染导致超时
export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/vehicle_db',
});

const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

import { broadcastUpdate } from '../../../lib/eventBroadcast';



export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vehicle_id = searchParams.get('vehicle_id');
  const name = searchParams.get('name');
  const status = searchParams.get('status');
  const location_x = searchParams.get('location_x');
  const location_y = searchParams.get('location_y');
  // 从查询参数获取API密钥
  const apiKeyFromQuery = searchParams.get('api_key');
  
  // API密钥验证 - 支持从Header或查询参数获取
  const authHeader = request.headers.get('authorization');
  const apiKeyFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const serverApiKey = process.env.API_KEY || 'default-key';
  
  // 检查API密钥（从Header或查询参数）
  const providedApiKey = apiKeyFromHeader || apiKeyFromQuery;
  
  // 仅在设置了API_KEY环境变量时才进行验证
  if (process.env.API_KEY && (!providedApiKey || providedApiKey !== serverApiKey)) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!vehicle_id || !status) {
    return new Response('Missing required parameters: vehicle_id and status', { status: 400 });
  }

  try {
    const updatedVehicle = await VehicleService.updateVehicleStatus(
      vehicle_id,
      name, // 传递name参数，如果为null则在service中处理
      status,
      location_x ? parseFloat(location_x) : undefined,
      location_y ? parseFloat(location_y) : undefined
    );

    // 广播更新事件
    broadcastUpdate(updatedVehicle);

    return new Response(JSON.stringify(updatedVehicle), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    return new Response(JSON.stringify({ error: 'Failed to update vehicle status' }), {
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
    const vehicle_id = params.id;
    
    if (!vehicle_id) {
      return new Response(JSON.stringify({ error: '缺少车辆ID参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 删除车辆
    const deletedVehicle = await VehicleService.deleteVehicle(vehicle_id);
    
    if (!deletedVehicle) {
      return new Response(JSON.stringify({ error: '未找到指定的车辆' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      message: '车辆删除成功',
      vehicle: deletedVehicle
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
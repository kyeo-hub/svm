import { NextRequest } from 'next/server';
import { VehicleService } from '../../../lib/vehicleService';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/vehicle_db',
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

// 简单的广播机制
let clients: any[] = [];

export function addClient(client: any) {
  clients.push(client);
}

export function removeClient(client: any) {
  clients = clients.filter(c => c !== client);
}

function broadcastUpdate(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      console.error('Error broadcasting message:', error);
      removeClient(client);
    }
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vehicle_id = searchParams.get('vehicle_id');
  const name = searchParams.get('name');
  const status = searchParams.get('status');
  const location_x = searchParams.get('location_x');
  const location_y = searchParams.get('location_y');
  
  // 简单的API密钥验证
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.API_KEY || 'default-key';
  
  // 仅在设置了API_KEY环境变量时才进行验证
  if (process.env.API_KEY && (!authHeader || authHeader !== `Bearer ${apiKey}`)) {
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
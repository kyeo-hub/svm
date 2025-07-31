import { NextRequest } from 'next/server';
import { VehicleService } from '../../../../lib/vehicleService';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vehicle_id = searchParams.get('vehicle_id');
  const startDateStr = searchParams.get('start_date');
  const endDateStr = searchParams.get('end_date');
  const type = searchParams.get('type') || 'duration'; // duration | segments | daily

  if (!vehicle_id) {
    return new Response(JSON.stringify({ error: 'Missing required parameter: vehicle_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 解析日期参数
  let startDate: Date;
  let endDate: Date;

  if (startDateStr) {
    startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) {
      return new Response(JSON.stringify({ error: 'Invalid start_date format. Use YYYY-MM-DD' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else {
    // 默认查询最近7天
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
  }

  if (endDateStr) {
    endDate = new Date(endDateStr);
    if (isNaN(endDate.getTime())) {
      return new Response(JSON.stringify({ error: 'Invalid end_date format. Use YYYY-MM-DD' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' 
      }
      });
    }
  } else {
    // 默认结束时间为今天
    endDate = new Date();
  }

  // 确保结束时间不早于开始时间
  if (endDate < startDate) {
    return new Response(JSON.stringify({ error: 'end_date must be after start_date' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let result;
    
    switch (type) {
      case 'segments':
        // 获取状态段数据
        result = await VehicleService.getVehicleStatusSegments(vehicle_id, startDate, endDate);
        break;
        
      case 'daily':
        // 获取每日统计数据
        result = await VehicleService.getVehicleDailyStats(vehicle_id, startDate, endDate);
        break;
        
      case 'duration':
      default:
        // 获取状态时长统计数据
        result = await VehicleService.getVehicleStatusDurationStats(vehicle_id, startDate, endDate);
        break;
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching vehicle stats:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch vehicle stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
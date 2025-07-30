import { NextRequest } from 'next/server';
import { VehicleService } from '../../../lib/vehicleService';

export async function GET(request: NextRequest) {
  try {
    const vehicles = await VehicleService.getAllVehicles();
    
    return new Response(JSON.stringify(vehicles), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch vehicles' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
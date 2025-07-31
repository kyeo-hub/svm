'use client';

import { useState, useEffect } from 'react';
import VehicleStats from '../../components/VehicleStats';

interface Vehicle {
  id: number;
  vehicle_id: string;
  name: string;
  status: '作业中' | '待命' | '维保中' | '故障中';
  location_x: number;
  location_y: number;
  last_updated: string;
}

export default function StatsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取所有车辆
  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      if (!response.ok) {
        throw new Error(`获取车辆列表失败: ${response.status}`);
      }
      
      const data = await response.json();
      setVehicles(data);
      
      // 默认选择第一辆车
      if (data.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(data[0].vehicle_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取车辆列表时发生未知错误');
      console.error('获取车辆列表错误:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 头部 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">特种车辆设备管理系统 - 统计分析</h1>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              错误: {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="px-4 py-6 sm:px-0">
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">选择车辆</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.vehicle_id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                        selectedVehicleId === vehicle.vehicle_id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedVehicleId(vehicle.vehicle_id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{vehicle.name}</h3>
                          <p className="text-gray-600 text-sm">编号: {vehicle.vehicle_id}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          vehicle.status === '作业中' 
                            ? 'bg-green-100 text-green-800' 
                            : vehicle.status === '待命' 
                            ? 'bg-blue-100 text-blue-800' 
                            : vehicle.status === '维保中' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {vehicle.status}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm mt-2">
                        最后更新: {new Date(vehicle.last_updated).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedVehicleId && (
                <VehicleStats vehicleId={selectedVehicleId} />
              )}

              {vehicles.length === 0 && !loading && (
                <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                  <p className="text-gray-500">暂无车辆数据</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
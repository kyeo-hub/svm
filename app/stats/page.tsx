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
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">特种车辆设备管理系统 - 统计分析</h1>
            <a 
              href="/" 
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              返回主页
            </a>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium">错误</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="px-4 py-6 sm:px-0">
              {selectedVehicleId && (
                <VehicleStats 
                  vehicleId={selectedVehicleId} 
                  vehicles={vehicles}
                  onVehicleChange={setSelectedVehicleId}
                />
              )}

              {vehicles.length === 0 && !loading && (
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">暂无车辆数据</h3>
                  <p className="mt-1 text-gray-500">系统中还没有添加任何车辆。</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
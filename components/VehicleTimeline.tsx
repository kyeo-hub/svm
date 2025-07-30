'use client';

import React, { useEffect, useState } from 'react';

interface Vehicle {
  id: number;
  vehicle_id: string;
  name: string;
  status: '作业中' | '待命' | '维保中' | '故障中';
  location_x: number;
  location_y: number;
  last_updated: string;
}

interface VehicleStatusHistory {
  id: number;
  vehicle_id: string;
  status: string;
  timestamp: string;
}

interface VehicleTimelineProps {
  vehicle: Vehicle | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case '作业中':
      return 'bg-green-500';
    case '待命':
      return 'bg-blue-500';
    case '维保中':
      return 'bg-yellow-500';
    case '故障中':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

export default function VehicleTimeline({ vehicle }: VehicleTimelineProps) {
  const [history, setHistory] = useState<VehicleStatusHistory[]>([]);

  useEffect(() => {
    if (vehicle) {
      // 模拟获取车辆状态历史
      const mockHistory: VehicleStatusHistory[] = [
        {
          id: 1,
          vehicle_id: vehicle.vehicle_id,
          status: '作业中',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 2,
          vehicle_id: vehicle.vehicle_id,
          status: '待命',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 3,
          vehicle_id: vehicle.vehicle_id,
          status: '维保中',
          timestamp: new Date(Date.now() - 10800000).toISOString()
        },
        {
          id: 4,
          vehicle_id: vehicle.vehicle_id,
          status: '故障中',
          timestamp: new Date(Date.now() - 14400000).toISOString()
        }
      ];
      setHistory(mockHistory);
    } else {
      setHistory([]);
    }
  }, [vehicle]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">
          {vehicle ? `${vehicle.name} - 24小时状态时间线` : '车辆状态时间线'}
        </h2>
      </div>
      <div className="px-6 py-4">
        {vehicle ? (
          <div className="flow-root">
            <ul className="relative border-l border-gray-200 ml-3">
              {history.map((item, index) => (
                <li key={item.id} className="mb-10 ml-6">
                  <div className={`absolute -left-3 mt-1.5 w-6 h-6 rounded-full ${getStatusColor(item.status)} border-2 border-white`}></div>
                  <div className="p-4 bg-gray-50 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{item.status}</h3>
                      <time className="text-sm font-normal text-gray-500">
                        {new Date(item.timestamp).toLocaleString('zh-CN')}
                      </time>
                    </div>
                    <p className="text-base text-gray-600">
                      车辆状态更新为"{item.status}"
                    </p>
                  </div>
                </li>
              ))}
              <li className="mb-10 ml-6">
                <div className={`absolute -left-3 mt-1.5 w-6 h-6 rounded-full ${getStatusColor(vehicle.status)} border-2 border-white`}></div>
                <div className="p-4 bg-gray-50 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{vehicle.status}</h3>
                    <time className="text-sm font-normal text-gray-500">
                      {new Date(vehicle.last_updated).toLocaleString('zh-CN')}
                    </time>
                  </div>
                  <p className="text-base text-gray-600">
                    当前状态
                  </p>
                </div>
              </li>
            </ul>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            请选择一个车辆查看其24小时状态时间线
          </div>
        )}
      </div>
    </div>
  );
}
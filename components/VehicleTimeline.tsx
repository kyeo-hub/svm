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
  name: string;
  status: string;
  timestamp: string;
}

interface VehicleTimelineProps {
  vehicles: Vehicle[];
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

const getStatusText = (status: string) => {
  switch (status) {
    case '作业中':
      return '工作中';
    case '待命':
      return '待命中';
    case '维保中':
      return '维保中';
    case '故障中':
      return '故障中';
    default:
      return status;
  }
};

export default function VehicleTimeline({ vehicles }: VehicleTimelineProps) {
  const [history, setHistory] = useState<VehicleStatusHistory[]>([]);

  useEffect(() => {
    // 获取所有车辆的24小时状态历史
    const fetchAllHistory = async () => {
      try {
        // 这里应该调用API获取所有车辆的历史状态
        // 由于目前没有提供批量获取历史状态的API，我们使用模拟数据
        const mockHistory: VehicleStatusHistory[] = [];
        
        // 为每个车辆生成一些历史记录
        vehicles.forEach(vehicle => {
          // 添加当前状态
          mockHistory.push({
            id: mockHistory.length + 1,
            vehicle_id: vehicle.vehicle_id,
            name: vehicle.name,
            status: vehicle.status,
            timestamp: vehicle.last_updated
          });
          
          // 添加一些历史状态（在24小时内的随机时间）
          const statuses = ['作业中', '待命', '维保中', '故障中'];
          for (let i = 1; i <= 3; i++) {
            const hoursAgo = Math.floor(Math.random() * 24) + 1;
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
            
            mockHistory.push({
              id: mockHistory.length + 1,
              vehicle_id: vehicle.vehicle_id,
              name: vehicle.name,
              status: randomStatus,
              timestamp: timestamp
            });
          }
        });
        
        // 按时间排序（最新的在前）
        mockHistory.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setHistory(mockHistory);
      } catch (error) {
        console.error('获取车辆历史状态失败:', error);
      }
    };
    
    if (vehicles.length > 0) {
      fetchAllHistory();
    } else {
      setHistory([]);
    }
  }, [vehicles]);

  // 过滤出最近24小时的记录
  const recentHistory = history.filter(item => {
    const itemTime = new Date(item.timestamp).getTime();
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    return itemTime >= twentyFourHoursAgo;
  });

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">
          所有车辆 - 24小时状态时间线
        </h2>
      </div>
      <div className="px-6 py-4">
        {vehicles.length > 0 ? (
          <div className="flow-root">
            <ul className="relative border-l border-gray-200 ml-3">
              {recentHistory.map((item) => (
                <li key={`${item.vehicle_id}-${item.timestamp}`} className="mb-10 ml-6">
                  <div className={`absolute -left-3 mt-1.5 w-6 h-6 rounded-full ${getStatusColor(item.status)} border-2 border-white`}></div>
                  <div className="p-4 bg-gray-50 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                        <span className="ml-2 text-sm text-gray-500">({item.vehicle_id})</span>
                      </div>
                      <time className="text-sm font-normal text-gray-500">
                        {new Date(item.timestamp).toLocaleString('zh-CN')}
                      </time>
                    </div>
                    <div className="flex items-center">
                      <span className={`px-2 py-1 rounded text-xs text-white ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                      <p className="ml-2 text-base text-gray-600">
                        状态更新为"{getStatusText(item.status)}"
                      </p>
                    </div>
                  </div>
                </li>
              ))}
              {recentHistory.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  最近24小时内无状态更新记录
                </div>
              )}
            </ul>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            暂无车辆数据
          </div>
        )}
      </div>
    </div>
  );
}
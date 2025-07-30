'use client';

import React from 'react';

interface Vehicle {
  id: number;
  vehicle_id: string;
  name: string;
  status: '作业中' | '待命' | '维保中' | '故障中';
  location_x: number;
  location_y: number;
  last_updated: string;
}

interface VehicleListProps {
  vehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
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

const getStatusTextColor = (status: string) => {
  switch (status) {
    case '作业中':
      return 'text-green-800';
    case '待命':
      return 'text-blue-800';
    case '维保中':
      return 'text-yellow-800';
    case '故障中':
      return 'text-red-800';
    default:
      return 'text-gray-800';
  }
};

const getStatusBgColor = (status: string) => {
  switch (status) {
    case '作业中':
      return 'bg-green-100';
    case '待命':
      return 'bg-blue-100';
    case '维保中':
      return 'bg-yellow-100';
    case '故障中':
      return 'bg-red-100';
    default:
      return 'bg-gray-100';
  }
};

export default function VehicleList({ vehicles, onSelectVehicle }: VehicleListProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">车辆状态列表</h2>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
        {vehicles.length === 0 ? (
          <div className="px-6 py-4 text-center text-gray-500">
            暂无车辆数据
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {vehicles.map((vehicle) => (
              <li 
                key={vehicle.vehicle_id} 
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                onClick={() => onSelectVehicle(vehicle)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 ${getStatusColor(vehicle.status)} rounded-full mr-3`}></div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{vehicle.name}</h3>
                      <p className="text-sm text-gray-500">ID: {vehicle.vehicle_id}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBgColor(vehicle.status)} ${getStatusTextColor(vehicle.status)}`}>
                    {vehicle.status}
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  最后更新: {new Date(vehicle.last_updated).toLocaleString('zh-CN')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
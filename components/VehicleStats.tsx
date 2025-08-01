'use client';

import { useState, useEffect } from 'react';
import { toShanghaiDateString } from '../lib/timeUtils';

interface Vehicle {
  id: number;
  vehicle_id: string;
  name: string;
  status: '作业中' | '待命' | '维保中' | '故障中';
  location_x: number;
  location_y: number;
  last_updated: string;
}

interface VehicleStatusDurationStats {
  '作业中': number;
  '待命': number;
  '维保中': number;
  '故障中': number;
}

interface VehicleStatusSegment {
  id: number;
  vehicle_id: string;
  status: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
}

interface DailyVehicleStats {
  id: number;
  vehicle_id: string;
  date: string;
  working_seconds: number;
  waiting_seconds: number;
  maintenance_seconds: number;
  fault_seconds: number;
}

export default function VehicleStats({ 
  vehicleId, 
  vehicles 
}: { 
  vehicleId: string; 
  vehicles?: Vehicle[]; // 可选的车辆列表，用于在CSV中显示车辆名称
}) {
  const [stats, setStats] = useState<VehicleStatusDurationStats | null>(null);
  const [segments, setSegments] = useState<VehicleStatusSegment[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyVehicleStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: toShanghaiDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    end: toShanghaiDateString(new Date())
  });
  const [viewType, setViewType] = useState<'duration' | 'segments' | 'daily'>('duration');

  // 获取统计数据
  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/vehicle/stats?vehicle_id=${vehicleId}&start_date=${dateRange.start}&end_date=${dateRange.end}&type=${viewType}`
      );
      
      if (!response.ok) {
        throw new Error(`获取统计信息失败: ${response.status}`);
      }
      
      const data = await response.json();
      
      switch (viewType) {
        case 'duration':
          setStats(data);
          break;
        case 'segments':
          setSegments(data);
          break;
        case 'daily':
          setDailyStats(data);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计信息时发生未知错误');
      console.error('获取统计信息错误:', err);
    } finally {
      setLoading(false);
    }
  };

  // 格式化秒数为可读的时间
  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0秒';
    
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (days > 0) result += `${days}天`;
    if (hours > 0) result += `${hours}小时`;
    if (minutes > 0) result += `${minutes}分钟`;
    if (secs > 0 && days === 0) result += `${secs}秒`;
    
    return result || '0秒';
  };

  // 获取状态颜色
  const getStatusColor = (status: string): string => {
    switch (status) {
      case '作业中': return 'bg-green-500';
      case '待命': return 'bg-blue-500';
      case '维保中': return 'bg-yellow-500';
      case '故障中': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // 获取状态文本颜色
  const getStatusTextColor = (status: string): string => {
    switch (status) {
      case '作业中': return 'text-green-500';
      case '待命': return 'text-blue-500';
      case '维保中': return 'text-yellow-500';
      case '故障中': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // 下载数据为CSV
  const downloadCSV = () => {
    let csvContent = '';
    const selectedVehicle = vehicles?.find(v => v.vehicle_id === vehicleId);
    const vehicleName = selectedVehicle ? selectedVehicle.name : vehicleId;
    
    switch (viewType) {
      case 'duration':
        if (!stats) return;
        csvContent = `车辆编号,车辆名称,状态,时长(秒),时长格式化\n`;
        Object.entries(stats).forEach(([status, seconds]) => {
          csvContent += `${vehicleId},${vehicleName},${status},${seconds},"${formatDuration(seconds)}"\n`;
        });
        break;
        
      case 'segments':
        if (segments.length === 0) return;
        csvContent = `ID,车辆编号,状态,开始时间,结束时间,持续时间(秒),持续时间格式化\n`;
        segments.forEach(segment => {
          csvContent += `${segment.id},${segment.vehicle_id},${segment.status},${segment.start_time},${segment.end_time || ''},${segment.duration_seconds || ''},"${segment.duration_seconds ? formatDuration(segment.duration_seconds) : ''}"\n`;
        });
        break;
        
      case 'daily':
        if (dailyStats.length === 0) return;
        csvContent = `ID,车辆编号,日期,作业中(秒),待命中(秒),维保中(秒),故障中(秒),作业中,待命中,维保中,故障中\n`;
        dailyStats.forEach(stat => {
          csvContent += `${stat.id},${stat.vehicle_id},${stat.date},${stat.working_seconds},${stat.waiting_seconds},${stat.maintenance_seconds},${stat.fault_seconds},"${formatDuration(stat.working_seconds)}","${formatDuration(stat.waiting_seconds)}","${formatDuration(stat.maintenance_seconds)}","${formatDuration(stat.fault_seconds)}"\n`;
        });
        break;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vehicle_stats_${vehicleId}_${viewType}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (vehicleId) {
      fetchStats();
    }
  }, [vehicleId, viewType, dateRange]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">车辆状态统计</h2>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={downloadCSV}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              下载数据
            </button>
          </div>
        </div>
        
        {/* 日期范围选择器 */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="border rounded px-3 py-2"
            />
          </div>
        </div>
        
        {/* 视图类型切换 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className={`px-4 py-2 rounded ${viewType === 'duration' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setViewType('duration')}
          >
            时长统计
          </button>
          <button
            className={`px-4 py-2 rounded ${viewType === 'segments' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setViewType('segments')}
          >
            状态段详情
          </button>
          <button
            className={`px-4 py-2 rounded ${viewType === 'daily' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setViewType('daily')}
          >
            每日统计
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          错误: {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {viewType === 'duration' && stats && (
            <div>
              <h3 className="text-xl font-semibold mb-4">状态时长统计</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                    <span className="font-medium">作业中</span>
                  </div>
                  <p className="text-2xl font-bold">{formatDuration(stats['作业中'])}</p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                    <span className="font-medium">待命</span>
                  </div>
                  <p className="text-2xl font-bold">{formatDuration(stats['待命'])}</p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="font-medium">维保中</span>
                  </div>
                  <p className="text-2xl font-bold">{formatDuration(stats['维保中'])}</p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                    <span className="font-medium">故障中</span>
                  </div>
                  <p className="text-2xl font-bold">{formatDuration(stats['故障中'])}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3">状态时长占比</h4>
                <div className="space-y-2">
                  {Object.entries(stats).map(([status, seconds]) => {
                    const totalSeconds = Object.values(stats).reduce((sum, s) => sum + s, 0);
                    const percentage = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
                    
                    return (
                      <div key={status}>
                        <div className="flex justify-between mb-1">
                          <span className={`font-medium ${getStatusTextColor(status)}`}>{status}</span>
                          <span>{percentage.toFixed(1)}% ({formatDuration(seconds)})</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${getStatusColor(status)}`} 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {viewType === 'segments' && (
            <div>
              <h3 className="text-xl font-semibold mb-4">状态段详情</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">开始时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">结束时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">持续时间</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {segments.map((segment) => (
                      <tr key={segment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(segment.status)}`}></div>
                            <span>{segment.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(segment.start_time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {segment.end_time ? new Date(segment.end_time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '当前状态'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {segment.duration_seconds ? formatDuration(segment.duration_seconds) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {segments.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    该时间段内没有状态变更记录
                  </div>
                )}
              </div>
            </div>
          )}

          {viewType === 'daily' && (
            <div>
              <h3 className="text-xl font-semibold mb-4">每日统计</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作业中</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">待命</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">维保中</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">故障中</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dailyStats.map((stat) => (
                      <tr key={stat.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {stat.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDuration(stat.working_seconds)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDuration(stat.waiting_seconds)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDuration(stat.maintenance_seconds)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDuration(stat.fault_seconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {dailyStats.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    该时间段内没有每日统计数据
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
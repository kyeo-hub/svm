'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useRouter } from 'next/navigation';

interface Vehicle {
  id?: number;
  vehicle_id: string;
  name: string;
  status: '作业中' | '待命' | '维保中' | '故障中';
  location_x?: number;
  location_y?: number;
  last_updated?: string;
}

// 定义Omit类型，或者确保正确导入
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [formData, setFormData] = useState<Omit<Vehicle, 'id' | 'last_updated'>>({ 
    vehicle_id: '', 
    name: '', 
    status: '待命',
    location_x: 114.466285854578,
    location_y: 30.671934347758334
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [qrCodesDataUrls, setQrCodesDataUrls] = useState<{[key: string]: string}>({});
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const router = useRouter();

  // 检查认证状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        router.push('/vehicles/login');
      }
    }
  }, [router]);

  // 获取所有车辆
  const fetchVehicles = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
      if (!apiKey) {
        router.push('/vehicles/login');
        return;
      }

      const response = await fetch('/api/vehicles', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.status === 401) {
        router.push('/vehicles/login');
        return;
      }
      
      const data = await response.json();
      setVehicles(data);
    } catch (err) {
      console.error('获取车辆列表失败:', err);
      setError('获取车辆列表失败');
    }
  };

  // 登出功能
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    router.push('/vehicles/login');
  };

  useEffect(() => {
    // 只有在客户端且已认证的情况下才获取车辆数据
    if (typeof window !== 'undefined') {
      fetchVehicles();
    }
    
    // 获取API密钥
    // 在客户端组件中，只能访问NEXT_PUBLIC_前缀的环境变量
    const key = process.env.NEXT_PUBLIC_API_KEY || '';
    setApiKey(key);
  }, []);

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'location_x' || name === 'location_y' ? parseFloat(value) || 0 : value
    }));
  };

  // 提交表单（创建或更新车辆）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
      if (!apiKey) {
        router.push('/vehicles/login');
        return;
      }

      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/vehicles/${formData.vehicle_id}` : '/api/vehicles';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(formData)
      });

      if (response.status === 401) {
        router.push('/vehicles/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '操作失败');
      }

      const vehicle = await response.json();
      setSuccess(editingId ? '车辆更新成功' : '车辆创建成功');
      
      // 重置表单
      setFormData({ 
        vehicle_id: '', 
        name: '', 
        status: '待命',
        location_x: 114.466285854578,
        location_y: 30.671934347758334
      });
      setEditingId(null);
      
      // 重新获取车辆列表
      fetchVehicles();
    } catch (err) {
      console.error('操作失败:', err);
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  // 编辑车辆
  const handleEdit = (vehicle: Vehicle) => {
    setFormData({
      vehicle_id: vehicle.vehicle_id,
      name: vehicle.name,
      status: vehicle.status,
      location_x: vehicle.location_x,
      location_y: vehicle.location_y
    });
    setEditingId(vehicle.id || null);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setFormData({ 
      vehicle_id: '', 
      name: '', 
      status: '待命',
      location_x: 114.466285854578,
      location_y: 30.671934347758334
    });
    setEditingId(null);
  };

  // 删除车辆
  const handleDelete = async (vehicle_id: string) => {
    if (!confirm('确定要删除这辆车吗？此操作不可恢复。')) {
      return;
    }

    try {
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';
      if (!apiKey) {
        router.push('/vehicles/login');
        return;
      }

      const response = await fetch(`/api/vehicles/${vehicle_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (response.status === 401) {
        router.push('/vehicles/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除失败');
      }

      setSuccess('车辆删除成功');
      fetchVehicles(); // 重新获取车辆列表
    } catch (err) {
      console.error('删除失败:', err);
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 生成二维码
  const generateQRCodes = async (vehicle: Vehicle) => {
    try {
      setSelectedVehicle(vehicle);
      setError(null);
      
      // 定义四种状态
      const statuses = [
        { name: '作业中', value: 'working' },
        { name: '待命', value: 'waiting' },
        { name: '维保中', value: 'maintenance' },
        { name: '故障中', value: 'fault' }
      ];

      // API密钥
      const apiKey = process.env.NEXT_PUBLIC_API_KEY || '';

      // 为每种状态生成二维码
      const qrCodes: {[key: string]: string} = {};
      for (const status of statuses) {
        const url = `${window.location.origin}/api/vehicle?vehicle_id=${vehicle.vehicle_id}&status=${status.value}&api_key=${apiKey}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 2
        });
        qrCodes[status.name] = dataUrl;
      }
      
      setQrCodesDataUrls(qrCodes);
    } catch (err) {
      console.error('生成二维码失败:', err);
      setError('生成二维码失败');
    }
  };

  // 下载所有二维码
  const downloadAllQRCodes = () => {
    if (!selectedVehicle) return;

    // 创建一个包含所有二维码的画布
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布大小（2列x2行，每个二维码200x200，加上边距和标签空间）
    canvas.width = 450;
    canvas.height = 550; // 增加高度以提供更多空间给文字

    // 白色背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制标题
    ctx.fillStyle = 'black';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`车辆: ${selectedVehicle.name} (${selectedVehicle.vehicle_id})`, canvas.width/2, 30);

    // 绘制二维码和标签
    const positions = [
      { x: 25, y: 60, status: '作业中' },
      { x: 225, y: 60, status: '待命' },
      { x: 25, y: 310, status: '维保中' }, // 增加垂直间距
      { x: 225, y: 310, status: '故障中' }  // 增加垂直间距
    ];

    positions.forEach(pos => {
      const img = new Image();
      img.src = qrCodesDataUrls[pos.status];
      ctx.drawImage(img, pos.x, pos.y, 200, 200);
      
      // 绘制状态标签
      ctx.font = 'bold 16px Arial';
      ctx.fillText(pos.status, pos.x + 100, pos.y + 225); // 调整文字位置
    });

    // 下载图像
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `车辆_${selectedVehicle.vehicle_id}_状态二维码.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">特种车辆管理</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              登出
            </button>
          </div>
          
          {/* 消息提示 */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg">
              {success}
            </div>
          )}
          
          {/* 车辆表单 */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? '编辑车辆' : '添加新车辆'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  车辆编号 *
                </label>
                <input
                  type="text"
                  name="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入车辆编号"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  车辆名称 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入车辆名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  初始状态
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="作业中">作业中</option>
                  <option value="待命">待命</option>
                  <option value="维保中">维保中</option>
                  <option value="故障中">故障中</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  经度
                </label>
                <input
                  type="number"
                  name="location_x"
                  value={formData.location_x}
                  onChange={handleInputChange}
                  step="any"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入经度"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  纬度
                </label>
                <input
                  type="number"
                  name="location_y"
                  value={formData.location_y}
                  onChange={handleInputChange}
                  step="any"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入纬度"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  {editingId ? '更新车辆' : '添加车辆'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  >
                    取消
                  </button>
                )}
              </div>
            </form>
          </div>
          
          {/* 车辆列表 */}
          <div>
            <h2 className="text-xl font-semibold mb-4">车辆列表</h2>
            {vehicles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无车辆数据
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        车辆编号
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        车辆名称
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        位置
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        最后更新
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle.vehicle_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {vehicle.vehicle_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.location_x?.toFixed(6)}, {vehicle.location_y?.toFixed(6)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.last_updated ? new Date(vehicle.last_updated).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => generateQRCodes(vehicle)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            生成二维码
                          </button>
                          <button
                            onClick={() => handleEdit(vehicle)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle.vehicle_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        {/* 二维码模态框 */}
        {selectedVehicle && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">
                    车辆 {selectedVehicle.name} ({selectedVehicle.vehicle_id}) 二维码
                  </h3>
                  <button 
                    onClick={() => {
                      setSelectedVehicle(null);
                      setQrCodesDataUrls({});
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-4">
                  <button
                    onClick={downloadAllQRCodes}
                    disabled={Object.keys(qrCodesDataUrls).length === 0}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下载所有二维码
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {Object.entries(qrCodesDataUrls).map(([status, dataUrl]) => (
                    <div key={status} className="text-center">
                      <div className="font-medium mb-2">{status}</div>
                      <img src={dataUrl} alt={`${status}二维码`} className="mx-auto" />
                      <div className="mt-2 text-sm text-gray-500">
                        扫描更新为{status}
                      </div>
                    </div>
                  ))}
                </div>
                
                {Object.keys(qrCodesDataUrls).length === 0 && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p>二维码生成中...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
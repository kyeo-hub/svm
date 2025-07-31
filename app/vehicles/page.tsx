'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface Vehicle {
  id?: number;
  vehicle_id: string;
  name: string;
  status: '作业中' | '待命' | '维保中' | '故障中';
  location_x?: number;
  location_y?: number;
}

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [formData, setFormData] = useState<Omit<Vehicle, 'id'>>({ 
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

  // 获取所有车辆
  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      setVehicles(data);
    } catch (err) {
      console.error('获取车辆列表失败:', err);
      setError('获取车辆列表失败');
    }
  };

  useEffect(() => {
    fetchVehicles();
    
    // 获取API密钥
    // 在客户端组件中，只能访问NEXT_PUBLIC_前缀的环境变量
    const key = process.env.NEXT_PUBLIC_API_KEY || '';
    setApiKey(key);
  }, []);

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'location_x' || name === 'location_y' ? parseFloat(value) || 0 : value
    });
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/vehicles/${editingId}` : '/api/vehicles';
      
      // 准备请求头
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // 仅在有API密钥时添加认证头
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(editingId ? { ...formData, id: editingId } : formData),
      });

      if (!response.ok) {
        throw new Error(editingId ? '更新车辆失败' : '创建车辆失败');
      }

      setSuccess(editingId ? '车辆更新成功' : '车辆创建成功');
      setFormData({ 
        vehicle_id: '', 
        name: '', 
        status: '待命',
        location_x: 114.466285854578,
        location_y: 30.671934347758334
      });
      setEditingId(null);
      fetchVehicles();
    } catch (err) {
      console.error('操作失败:', err);
      setError(editingId ? '更新车辆失败' : '创建车辆失败');
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

  // 删除车辆
  const handleDelete = async (vehicle_id: string) => {
    if (!confirm('确定要删除这辆车吗？')) return;

    try {
      // 准备请求头
      const headers: HeadersInit = {};
      
      // 仅在有API密钥时添加认证头
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const response = await fetch(`/api/vehicles/${vehicle_id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error('车辆未找到');
        } else {
          throw new Error(errorData.error || '删除车辆失败');
        }
      }

      setSuccess('车辆删除成功');
      fetchVehicles();
    } catch (err) {
      console.error('删除失败:', err);
      setError(err instanceof Error ? err.message : '删除车辆失败');
    }
  };

  // 生成所有状态的二维码
  const generateAllQRCodes = async (vehicle: Vehicle) => {
    try {
      setSelectedVehicle(vehicle);
      
      // 为四种状态生成二维码
      const statuses = [
        { name: '作业中', value: 'working' },
        { name: '待命', value: 'waiting' },
        { name: '维保中', value: 'maintenance' },
        { name: '故障中', value: 'fault' }
      ];
      
      const qrCodes: {[key: string]: string} = {};
      
      for (const status of statuses) {
        // 生成包含API密钥的URL（如果有的话）
        let url = `${window.location.origin}/api/vehicle?vehicle_id=${vehicle.vehicle_id}&status=${status.value}&name=${encodeURIComponent(vehicle.name)}`;
        
        // 如果有API密钥，添加到查询参数中
        if (apiKey) {
          url += `&authorization=Bearer ${apiKey}`;
        }
        
        // 生成二维码
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">特种车辆管理</h1>
          
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
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? '编辑车辆' : '新增车辆'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="vehicle_id" className="block text-sm font-medium text-gray-700 mb-1">
                  车辆编号 *
                </label>
                <input
                  type="text"
                  id="vehicle_id"
                  name="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  车辆名称 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  状态 *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="作业中">作业中</option>
                  <option value="待命">待命</option>
                  <option value="维保中">维保中</option>
                  <option value="故障中">故障中</option>
                </select>
              </div>

              <div>
                <label htmlFor="location_x" className="block text-sm font-medium text-gray-700 mb-1">
                  经度
                </label>
                <input
                  type="number"
                  id="location_x"
                  name="location_x"
                  value={formData.location_x}
                  onChange={handleInputChange}
                  step="any"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="location_y" className="block text-sm font-medium text-gray-700 mb-1">
                  纬度
                </label>
                <input
                  type="number"
                  id="location_y"
                  name="location_y"
                  value={formData.location_y}
                  onChange={handleInputChange}
                  step="any"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {editingId ? '更新车辆' : '新增车辆'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ 
                        vehicle_id: '', 
                        name: '', 
                        status: '待命',
                        location_x: 114.466285854578,
                        location_y: 30.671934347758334
                      });
                    }}
                    className="ml-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      车辆编号
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      车辆名称
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      位置
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.vehicle_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vehicle.vehicle_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vehicle.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${vehicle.status === '作业中' ? 'bg-green-100 text-green-800' : 
                            vehicle.status === '待命' ? 'bg-blue-100 text-blue-800' : 
                            vehicle.status === '维保中' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}>
                          {vehicle.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vehicle.location_x?.toFixed(6)}, {vehicle.location_y?.toFixed(6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(vehicle)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle.vehicle_id)}
                          className="text-red-600 hover:text-red-900 mr-3"
                        >
                          删除
                        </button>
                        <button
                          onClick={() => generateAllQRCodes(vehicle)}
                          className="text-green-600 hover:text-green-900"
                        >
                          生成二维码
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 二维码展示区域 */}
          {Object.keys(qrCodesDataUrls).length > 0 && selectedVehicle && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  车辆 {selectedVehicle.vehicle_id} 状态二维码
                </h2>
                <button
                  onClick={downloadAllQRCodes}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  下载所有二维码
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8"> {/* 增加间距 */}
                {Object.entries(qrCodesDataUrls).map(([status, dataUrl]) => (
                  <div key={status} className="flex flex-col items-center">
                    <img 
                      src={dataUrl} 
                      alt={`${selectedVehicle.name} - ${status}`} 
                      className="border p-2 bg-white"
                    />
                    <p className="mt-3 text-sm font-medium text-gray-700"> {/* 增加上边距 */}
                      {status}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>说明：每个二维码对应一种状态，扫描后可直接更新车辆状态。</p>
                <p className="mt-1">车辆名称: {selectedVehicle.name} ({selectedVehicle.vehicle_id})</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
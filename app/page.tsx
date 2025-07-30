'use client';

import { useEffect, useState, useRef } from 'react';
import VehicleList from '../components/VehicleList';
import VehicleTimeline from '../components/VehicleTimeline';
import 'leaflet/dist/leaflet.css';

// 只在客户端导入leaflet
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  
  // 修复Leaflet标记图标问题
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface Vehicle {
  id: number;
  vehicle_id: string;
  name: string;
  status: '作业中' | '待命' | '维保中' | '故障中';
  location_x: number;
  location_y: number;
  last_updated: string;
}

// 计算各种状态的车辆数量
const getStatusCounts = (vehicles: Vehicle[]) => {
  const counts = {
    working: 0, // 作业中
    waiting: 0, // 待命
    maintenance: 0, // 维保中
    fault: 0, // 故障中
    total: vehicles.length
  };

  vehicles.forEach(vehicle => {
    switch (vehicle.status) {
      case '作业中':
        counts.working++;
        break;
      case '待命':
        counts.waiting++;
        break;
      case '维保中':
        counts.maintenance++;
        break;
      case '故障中':
        counts.fault++;
        break;
    }
  });

  return counts;
};

// 默认地图配置
const defaultMapConfig = {
  defaultCenter: {
    lat: 39.9042,
    lng: 116.4074
  },
  defaultZoom: 10,
  minZoom: 3,
  maxZoom: 18,
  zoomControl: true,
  attribution: {
    gaode: '&copy; 高德地图'
  }
};

export default function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [mapType, setMapType] = useState<'gaode'>('gaode');
  const [mapConfig, setMapConfig] = useState(defaultMapConfig);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const hasAdjustedBounds = useRef(false); // 用于跟踪是否已自动调整视野

  // 设置客户端标识
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 获取所有车辆数据
  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  // 初始化地图配置
  useEffect(() => {
    const loadMapConfig = async () => {
      try {
        // 在实际应用中，这里可以从配置文件加载地图设置
        // 为了简化，我们使用默认配置
        setMapConfig(defaultMapConfig);
      } catch (error) {
        console.error('加载地图配置失败，使用默认配置:', error);
        setMapConfig(defaultMapConfig);
      }
    };

    loadMapConfig();
  }, []);

  // 初始化地图
  const initializeMap = () => {
    if (typeof window === 'undefined' || !L || !mapContainerRef.current || mapRef.current) return;
    
    // 使用配置文件中的中心点和缩放级别
    const center: [number, number] = [mapConfig.defaultCenter.lat, mapConfig.defaultCenter.lng];
    const zoom = mapConfig.defaultZoom;
    
    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false, // 禁用默认控件位置
      minZoom: mapConfig.minZoom,
      maxZoom: mapConfig.maxZoom
    }).setView(center, zoom);

    // 手动添加缩放控件到右上角，避免与统计面板冲突
    if (mapConfig.zoomControl) {
      L.control.zoom({ position: 'topright' }).addTo(mapRef.current);
    }

    // 添加地图瓦片图层
    addMapLayer(mapRef.current, mapType);

    // 添加车辆标记
    updateMapMarkers(vehicles);
  };

  // 添加地图图层
  const addMapLayer = (map: any, type: string) => {
    if (!L) return;
    
    let layer;
    
    // 只保留高德地图
    layer = L.tileLayer('https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      attribution: mapConfig.attribution.gaode,
      maxZoom: mapConfig.maxZoom
    });
    
    layer.addTo(map);
  };

  // 切换地图类型 (只保留高德地图)
  const switchMapLayer = (type: 'gaode') => {
    setMapType(type);
    
    if (!L || !mapRef.current) return;
    
    // 清除现有图层
    mapRef.current.eachLayer((layer: any) => {
      mapRef.current?.removeLayer(layer);
    });
    
    // 添加新图层
    addMapLayer(mapRef.current, type);
    updateMapMarkers(vehicles);
  };

  // 更新地图标记
  const updateMapMarkers = (vehicles: Vehicle[]) => {
    if (!L || !mapRef.current) return;

    // 清除现有的标记
    Object.values(markersRef.current).forEach(marker => mapRef.current?.removeLayer(marker));
    markersRef.current = {};

    // 为每辆车添加标记
    vehicles.forEach(vehicle => {
      if (vehicle.location_x && vehicle.location_y) {
        // 根据车辆状态设置标记颜色
        const statusColors: { [key: string]: string } = {
          '作业中': 'green',
          '待命': 'blue',
          '维保中': 'yellow',
          '故障中': 'red'
        };

        // 创建自定义图标
        const icon = L.divIcon({
          className: 'vehicle-marker',
          html: `<div class="marker" style="background-color: ${statusColors[vehicle.status] || 'gray'}">
                   <span class="marker-text">${vehicle.vehicle_id}</span>
                 </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        // 创建标记并添加到地图
        const marker = L.marker([vehicle.location_y, vehicle.location_x], { icon })
          .addTo(mapRef.current)
          .bindPopup(`
            <div>
              <h3>${vehicle.name}</h3>
              <p>编号: ${vehicle.vehicle_id}</p>
              <p>状态: ${vehicle.status}</p>
              <p>更新时间: ${new Date(vehicle.last_updated).toLocaleString()}</p>
            </div>
          `);

        // 添加点击事件
        marker.on('click', () => {
          setSelectedVehicle(vehicle);
        });

        // 保存标记引用
        markersRef.current[vehicle.vehicle_id] = marker;
      }
    });
    
    // 在地图初始化后自动调整视野以包含所有车辆（仅执行一次）
    if (!hasAdjustedBounds.current && vehicles.length > 0) {
      setTimeout(() => {
        fitBoundsToVehicles();
        hasAdjustedBounds.current = true;
      }, 100);
    }
  };

  // 建立SSE连接
  useEffect(() => {
    fetchVehicles(); // 初始加载

    // 只在客户端建立SSE连接
    if (typeof window === 'undefined') return;

    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
      if (event.data === 'heartbeat') return;
      if (event.data === 'connected') return;
      
      try {
        const updatedVehicle = JSON.parse(event.data);
        // 更新车辆列表
        setVehicles(prevVehicles => {
          const existingIndex = prevVehicles.findIndex(v => v.vehicle_id === updatedVehicle.vehicle_id);
          if (existingIndex >= 0) {
            const updatedVehicles = [...prevVehicles];
            updatedVehicles[existingIndex] = updatedVehicle;
            return updatedVehicles;
          } else {
            return [updatedVehicle, ...prevVehicles];
          }
        });
        
        // 更新地图标记
        if (mapRef.current) {
          updateMapMarkers([...vehicles.filter(v => v.vehicle_id !== updatedVehicle.vehicle_id), updatedVehicle]);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };

    // 清理函数
    return () => {
      eventSource.close();
    };
  }, [vehicles]);

  // 初始化地图
  useEffect(() => {
    if (!isClient) return;
    
    // 延迟初始化地图，确保DOM已准备好
    const timer = setTimeout(() => {
      // 如果地图已经存在，先清理
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        hasAdjustedBounds.current = false; // 重置视野调整标记
      }
      
      initializeMap();
    }, 100);
    
    // 清理函数
    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapType, isClient, mapConfig]);

  // 更新地图标记当车辆数据变化时
  useEffect(() => {
    if (!isClient || !mapRef.current) return;
    
    updateMapMarkers(vehicles);
    
    // 如果有选中的车辆，确保其在地图上可见
    if (selectedVehicle && mapRef.current) {
      const marker = markersRef.current[selectedVehicle.vehicle_id];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [vehicles, selectedVehicle, isClient]);

  // 自动调整地图视野以包含所有车辆
  const fitBoundsToVehicles = () => {
    if (!L || !mapRef.current || vehicles.length === 0) return;
    
    const bounds = L.latLngBounds();
    let hasValidLocations = false;
    
    vehicles.forEach(vehicle => {
      if (vehicle.location_x && vehicle.location_y) {
        bounds.extend([vehicle.location_y, vehicle.location_x]);
        hasValidLocations = true;
      }
    });
    
    if (hasValidLocations && bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // 手动调整地图视野
  const handleFitBounds = () => {
    fitBoundsToVehicles();
  };

  const statusCounts = getStatusCounts(vehicles);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 头部 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">特种车辆设备管理系统</h1>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* 地图区域 */}
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6 relative">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">车辆位置地图</h2>
                <div className="flex space-x-2">
                  <button 
                    className={`px-3 py-1 rounded text-sm ${mapType === 'gaode' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                    onClick={() => switchMapLayer('gaode')}
                  >
                    高德地图
                  </button>
                  <button 
                    className="px-3 py-1 rounded text-sm bg-gray-200"
                    onClick={handleFitBounds}
                  >
                    自动调整视野
                  </button>
                </div>
              </div>
              
              <div 
                ref={mapContainerRef} 
                className="h-96 bg-gray-200 rounded-lg relative"
                style={{ height: '1000px' }}
              >
                {!isClient && (
                  <div className="flex items-center justify-center h-full">
                    <div>地图加载中...</div>
                  </div>
                )}
                
                {/* 悬浮的车辆状态统计 */}
                {isClient && (
                  <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-4 z-[1000]">
                    <h3 className="font-bold text-lg mb-2">车辆状态统计</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm">工作中: {statusCounts.working}台</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm">待命中: {statusCounts.waiting}台</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-sm">维保中: {statusCounts.maintenance}台</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm">故障中: {statusCounts.fault}台</span>
                      </div>
                      <div className="col-span-2 mt-2 pt-2 border-t border-gray-200">
                        <span className="font-semibold">总计: {statusCounts.total}台</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm">作业中</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm">待命</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-sm">维保中</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm">故障中</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* 左侧 - 车辆状态列表 */}
            <div className="md:w-1/2">
              <VehicleList 
                vehicles={vehicles} 
                onSelectVehicle={setSelectedVehicle} 
              />
            </div>

            {/* 右侧 - 时间线 */}
            <div className="md:w-1/2">
              <VehicleTimeline vehicles={vehicles} />
            </div>
          </div>

        </div>
      </main>

      <style jsx global>{`
        .vehicle-marker {
          width: 40px;
          height: 40px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .marker {
          width: 30px;
          height: 30px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .marker-text {
          transform: rotate(45deg);
          color: white;
          font-size: 10px;
          font-weight: bold;
          text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
}
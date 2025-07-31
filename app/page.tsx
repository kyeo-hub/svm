'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
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
  
  // SSE连接状态和时间状态
  const [sseStatus, setSseStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [currentTime, setCurrentTime] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 设置客户端标识
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('zh-CN', { 
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }));
    }, 1000);

    return () => clearInterval(timer);
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
        // 从配置文件加载地图设置
        const response = await fetch('/api/map-config');
        if (response.ok) {
          const config = await response.json();
          setMapConfig(config);
        } else {
          // 如果无法获取配置，则使用默认配置
          console.warn('无法加载地图配置，使用默认配置');
          setMapConfig(defaultMapConfig);
        }
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
  const updateMapMarkers = (vehicles: Vehicle[] | ((prevVehicles: Vehicle[]) => Vehicle[])) => {
    if (!L || !mapRef.current) return;

    // 如果传入的是函数，则获取当前车辆列表并应用函数
    let vehiclesArray: Vehicle[];
    if (typeof vehicles === 'function') {
      // 这里我们只需要类型正确，实际不会执行到这个分支
      // 因为我们只在setVehicles中使用函数形式
      return;
    } else {
      vehiclesArray = vehicles;
    }

    // 清除现有的标记
    Object.values(markersRef.current).forEach(marker => mapRef.current?.removeLayer(marker));
    markersRef.current = {};

    // 为每辆车添加标记
    vehiclesArray.forEach(vehicle => {
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
  };

  // 建立SSE连接
  const connectSSE = () => {
    if (typeof window === 'undefined') return;

    // 清除之前的重连定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setSseStatus('connecting');
    
    // 关闭之前的连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/events');
    eventSourceRef.current = eventSource;
    
    eventSource.onopen = () => {
      setSseStatus('connected');
    };

    eventSource.onmessage = (event) => {
      if (event.data === 'heartbeat') return;
      if (event.data === 'connected') return;
      
      try {
        const updatedVehicle = JSON.parse(event.data);
        // 更新车辆列表
        setVehicles(prevVehicles => {
          const existingIndex = prevVehicles.findIndex(v => v.vehicle_id === updatedVehicle.vehicle_id);
          if (existingIndex >= 0) {
            // 更新现有车辆
            const updatedVehicles = [...prevVehicles];
            updatedVehicles[existingIndex] = {...updatedVehicle};
            return updatedVehicles;
          } else {
            // 添加新车辆到列表开头
            return [updatedVehicle, ...prevVehicles];
          }
        });
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setSseStatus('disconnected');
      
      // 尝试重连
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, 5000); // 5秒后重连
      }
    };
  };

  // 建立SSE连接
  useEffect(() => {
    // 只在客户端获取初始车辆数据
    if (typeof window !== 'undefined') {
      fetchVehicles();
    }

    // 只在客户端建立SSE连接
    if (typeof window !== 'undefined') {
      connectSSE();
    }

    // 清理函数
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

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
    
    // 在地图初始化后自动调整视野以包含所有车辆（仅执行一次）
    if (!hasAdjustedBounds.current && vehicles.length > 0) {
      setTimeout(() => {
        fitBoundsToVehicles();
        hasAdjustedBounds.current = true;
      }, 100);
    }
  }, [vehicles, selectedVehicle, isClient]);

  /**
   * 检查指定位置是否在地图视野内
   * @param latLng 要检查的位置
   * @param map 地图实例
   * @param buffer 缓冲区比例（0-1），0表示完全匹配，1表示预留100%的缓冲空间
   * @returns 是否在视野内
   */
  const isLocationInMapBounds = (latLng: L.LatLng, map: L.Map, buffer: number = 0.2): boolean => {
    if (!map) return false;
    
    const bounds = map.getBounds();
    
    // 获取视野的西南角和东北角
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    
    // 计算带有缓冲区的实际可见区域
    const bufferLat = (northEast.lat - southWest.lat) * buffer;
    const bufferLng = (northEast.lng - southWest.lng) * buffer;
    
    const extendedBounds = L.latLngBounds(
      L.latLng(southWest.lat - bufferLat, southWest.lng - bufferLng),
      L.latLng(northEast.lat + bufferLat, northEast.lng + bufferLng)
    );
    
    return extendedBounds.contains(latLng);
  };

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

  // 手动重连SSE
  const handleReconnect = () => {
    connectSSE();
  };

  const statusCounts = getStatusCounts(vehicles);

  // 获取连接状态显示文本和颜色
  const getSseStatusDisplay = () => {
    switch (sseStatus) {
      case 'connected':
        return { text: '已连接', color: 'text-green-500' };
      case 'connecting':
        return { text: '连接中...', color: 'text-yellow-500' };
      case 'disconnected':
        return { text: '已断开', color: 'text-red-500' };
      default:
        return { text: '未知', color: 'text-gray-500' };
    }
  };

  const sseStatusDisplay = getSseStatusDisplay();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 头部 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">特种车辆设备管理系统</h1>
            <nav className="flex space-x-4">
              <Link 
                href="/stats" 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                统计分析
              </Link>
              <Link 
                href="/vehicles" 
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                车辆管理
              </Link>
            </nav>
          </div>
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
              
              {/* SSE状态和当前时间显示 */}
              <div className="mb-4 flex flex-wrap items-center justify-between bg-gray-50 p-2 rounded">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">SSE状态:</span>
                    <span className={`text-sm font-medium ${sseStatusDisplay.color}`}>
                      {sseStatusDisplay.text}
                    </span>
                    {sseStatus === 'disconnected' && (
                      <button 
                        onClick={handleReconnect}
                        className="ml-2 text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                      >
                        重新连接
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  当前时间: {currentTime}
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
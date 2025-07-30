# 地图配置说明

## 配置文件位置
地图配置存储在 [mapConfig.json](file:///d:/special_vehicles_manage/vehicle_management_system/data/mapConfig.json) 文件中。

## 配置项说明

### defaultCenter
设置地图默认中心点坐标：
- `lat`: 纬度
- `lng`: 经度

### defaultZoom
设置地图默认缩放级别，数值越大地图越详细。

### minZoom 和 maxZoom
设置地图最小和最大缩放级别，限制用户缩放范围。

### zoomControl
是否显示缩放控件。

### attribution
设置不同地图服务的归属信息。

## 如何修改地图初始化地点

1. 打开 [data/mapConfig.json](file:///d:/special_vehicles_manage/vehicle_management_system/data/mapConfig.json) 文件
2. 修改 `defaultCenter` 中的 `lat` 和 `lng` 值
3. 保存文件
4. 重新启动开发服务器（如果正在运行）或刷新页面

## 示例配置

```json
{
  "defaultCenter": {
    "lat": 31.2304,
    "lng": 121.4737
  },
  "defaultZoom": 12,
  "minZoom": 3,
  "maxZoom": 18,
  "zoomControl": true,
  "attribution": {
    "osm": "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
    "gaode": "&copy; 高德地图",
    "baidu": "&copy; 百度地图"
  }
}
```

这个示例将地图中心设置为上海位置，并将默认缩放级别设置为12。

## 自动调整视野功能

页面还提供了一个"自动调整视野"按钮，点击后地图会自动调整视野范围以包含所有车辆标记。
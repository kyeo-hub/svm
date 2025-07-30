# 预设车辆数据维护说明

## 文件位置
预设车辆数据存储在 [presetVehicles.json](file:///d:/special_vehicles_manage/vehicle_management_system/data/presetVehicles.json) 文件中。

## 数据结构
每个车辆对象包含以下字段：
- `vehicle_id`: 车辆编号（唯一标识符）
- `name`: 车辆名称
- `status`: 初始状态（作业中/待命/维保中/故障中）
- `location_x`: 经度坐标
- `location_y`: 纬度坐标

## 如何添加新车辆
在 [presetVehicles.json](file:///d:/special_vehicles_manage/vehicle_management_system/data/presetVehicles.json) 文件中添加新的车辆对象，例如：
```json
{
  "vehicle_id": "M6",
  "name": "特种车辆 M6",
  "status": "待命",
  "location_x": 116.4154,
  "location_y": 39.9122
}
```

## 如何修改现有车辆
直接编辑 [presetVehicles.json](file:///d:/special_vehicles_manage/vehicle_management_system/data/presetVehicles.json) 文件中对应车辆的信息。

## 如何删除车辆
从 [presetVehicles.json](file:///d:/special_vehicles_manage/vehicle_management_system/data/presetVehicles.json) 文件中移除对应的车辆对象。

## 重新加载数据
修改完 [presetVehicles.json](file:///d:/special_vehicles_manage/vehicle_management_system/data/presetVehicles.json) 文件后，运行以下命令重新初始化车辆数据：
```bash
pnpm run init:vehicles
```

注意：这将使用文件中的数据覆盖数据库中的现有车辆数据。
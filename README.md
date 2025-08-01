# 特种车辆设备管理系统

## 项目概述

开发一个基于Web的特种车辆设备实时监控与管理系统，通过简单地图界面实现车辆状态可视化展示。

## 核心功能

### 1. 地图展示功能
- 静态地图界面，实时展示所有特种车辆设备的位置和状态
- 车辆图标根据不同状态显示不同颜色标识
- 支持高德地图服务
- 自动调整视野功能，确保所有车辆在视野范围内

### 2. 车辆状态管理
操作人员通过扫描车辆二维码，直接向API发送状态信息，系统展示以下状态：
- 作业中（绿色标识）：车辆正在执行任务
- 待命（蓝色标识）：车辆可立即投入使用
- 维保中（黄色标识）：车辆正在进行维护保养
- 故障中（红色标识）：车辆发生故障，无法使用

### 3. 数据交互要求
- 简化的API接口，支持通过webhook直接接收二维码扫描信息发送GET请求
- 无需前端登录验证，扫码即可直接发送状态更新
- 使用Server-Sent Events (SSE) 技术实现状态变更的即时推送到展示界面
- 左上角列表展示车辆状态和作业内容等简单信息
- 左下角时间线展示各车辆24小时状态

### 4. 数据存储要求
- 对车辆状态进行存储，实现持久化，可支持简单查询
- 可以调取每台车工作、维保或故障期间的相关数据（如工作量、保养情况等）
- 数据库表结构设计：
  - vehicles: 存储车辆基本信息
  - vehicle_status_history: 车辆状态历史记录
  - vehicle_status_segments: 车辆状态段记录（记录每次状态的开始和结束时间）
  - daily_vehicle_stats: 每日统计表（用于加速查询）

### 5. 实时通信
- 使用Server-Sent Events (SSE) 实现实时状态推送
- 客户端通过EventSource连接到服务器事件流
- 状态更新时自动在地图上更新车辆标记

### 6. 统计分析功能
- 支持按时间段查询车辆状态时长统计
- 提供状态段详情查看功能
- 提供每日统计数据查看功能
- 支持自定义时间范围查询

### 7. 车辆管理功能
- 支持添加新车辆
- 支持删除车辆及其相关数据
- 支持查看所有车辆列表
- 提供预设车辆数据初始化功能
- 管理页面需要登录验证才能访问

## 技术栈
- 框架：Next.js (全栈框架，同时处理前端渲染和后端API)
- UI组件：Tailwind CSS
- API实现：Next.js API Routes (用于处理webhook和其他后端逻辑)
- 实时通信：SSE(与Next.js集成实现SSE功能)
- 数据存储：PostgreSQL数据库
- 地图服务：Leaflet.js + 高德地图

## 安全要求
- 简单的API密钥验证
- 基本的HTTPS通信保障
- 管理页面需要登录验证

## 认证机制

系统使用多种认证机制来平衡安全性和可用性：

1. 公开访问：主页和统计分析页面可以公开访问，无需认证
2. API接口认证：使用API密钥（API_KEY）进行认证，用于车辆状态更新等公开接口
3. 管理页面认证：使用用户名/密码登录，生成token进行认证，用于管理功能

认证检查说明：
- GET /api/vehicles（获取所有车辆）：公开访问
- POST /api/vehicles（创建车辆）：需要认证
- PUT/DELETE /api/vehicles/\[id\]（更新/删除车辆）：需要认证
- GET /api/vehicle（更新车辆状态）：使用API密钥认证

所有认证都通过HTTP Authorization头传递，格式为：`Bearer <token_or_api_key>`，同时也支持通过查询参数`api_key`传递API密钥。

## 时区设置

系统默认使用上海时区（Asia/Shanghai）进行时间处理。要配置时区，请在环境变量文件中设置：

```
TZ=Asia/Shanghai
```

系统在以下方面使用时区设置：
1. 数据库连接时设置时区为Asia/Shanghai
2. 所有时间相关的数据库操作使用NOW()函数获取当前上海时区时间
3. 前端显示时间会转换为上海时区
4. 统计数据计算基于上海时区的日期

## 管理页面登录

管理页面需要登录验证才能访问，以确保系统的安全性。默认的登录凭据如下：

```
用户名: admin
密码: admin123
```

在生产环境中，建议修改默认凭据。可以通过设置以下环境变量来自定义登录凭据：

```
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_password
ADMIN_SECRET_KEY=your_secret_key
```

## 二维码生成与使用

系统为每辆车生成四种状态的二维码，分别对应：
- 作业中
- 待命
- 维保中
- 故障中

二维码使用说明：
1. 二维码中不包含API密钥，避免泄露风险
2. 系统通过环境变量中的API_KEY进行认证
3. 扫描二维码时，系统会自动验证请求的合法性
4. 每个二维码对应一个特定的车辆和状态更新操作

## API接口说明

### 车辆状态更新
```
GET /api/vehicle?vehicle_id=:id&status=:status[&name=:name&location_x=:x&location_y=:y]
```
通过GET请求更新车辆状态，支持可选的车辆名称和位置信息。
认证方式：通过HTTP Header `Authorization: Bearer <API_KEY>` 或查询参数 `api_key=<API_KEY>`

### 获取所有车辆
```
GET /api/vehicles
```
获取系统中所有车辆的信息列表。

### 创建新车辆
```
POST /api/vehicles
```
创建新车辆，需要提供车辆ID、名称和初始状态。

### 删除车辆
```
DELETE /api/vehicle/:id
```
删除指定ID的车辆及其所有相关数据。

### 获取车辆统计信息
```
GET /api/vehicle/stats?vehicle_id=:id[&start_date=:start&end_date=:end&type=:type]
```
获取车辆统计信息，支持三种类型：
- duration: 状态时长统计（默认）
- segments: 状态段详情
- daily: 每日统计数据

### SSE事件流
```
GET /api/events
```
建立Server-Sent Events连接，接收实时车辆状态更新。

## 数据统计与查询优化

系统采用以下策略实现高效的状态时长统计与查询：

1. 状态段精确记录：
   - 每次状态变化记录一个状态段
   - 自动计算持续时间

2. 每日备份优化查询：
   - 每日凌晨执行聚合任务
   - 创建日统计表加速查询
   - 状态变化时实时更新日统计

3. 高效查询接口：
   - 按日/周/月/年快速查询
   - 智能使用日统计表避免全表扫描

4. 性能优化：
   - 分区表与索引
   - 查询缓存
   - 增量更新
   - 数据归档

## Docker部署

项目支持通过Docker进行部署，提供了Dockerfile和docker-compose.yml文件。

### 使用Docker Compose部署（推荐）

1. 确保已安装Docker和Docker Compose
2. 复制`.env.production.example`为`.env`并根据需要修改配置：
   ```bash
   cp .env.production.example .env
   ```
3. 构建并启动服务：
   ```bash
   docker-compose up -d
   ```
4. 初始化数据库（首次部署时）：
   ```bash
   docker-compose run init
   ```
5. 访问应用：http://localhost:3000

### 使用单独的Docker部署

1. 构建镜像：
   ```bash
   docker build -t vehicle-management-system .
   ```
2. 运行容器（需要连接到PostgreSQL数据库）：
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e DATABASE_URL=postgresql://user:password@host:port/database \
     -e API_KEY=your-api-key \
     -e ADMIN_USERNAME=admin \
     -e ADMIN_PASSWORD=admin123 \
     -e ADMIN_SECRET_KEY=your-secret-key \
     -e TZ=Asia/Shanghai \
     vehicle-management-system
   ```

### 环境变量说明

- `DATABASE_URL`: PostgreSQL数据库连接字符串
- `API_KEY`: 用于API认证的密钥
- `ADMIN_USERNAME`: 管理员用户名
- `ADMIN_PASSWORD`: 管理员密码
- `ADMIN_SECRET_KEY`: 用于生成JWT token的密钥
- `TZ`: 时区设置，默认为Asia/Shanghai
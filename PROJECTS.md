# 特种车辆设备管理系统开发需求

## 项目概述
开发一个基于Web的特种车辆设备实时监控与管理系统，通过简单地图界面实现车辆状态可视化展示。

## 核心功能需求

### 1. 地图展示功能
- 静态地图界面，实时展示所有特种车辆设备的位置和状态
- 车辆图标根据不同状态显示不同颜色标识

### 2. 车辆状态管理
操作人员通过扫描车辆二维码，直接向API发送状态信息，系统需展示以下状态：
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

## 技术栈建议
- 框架：Next.js (全栈框架，同时处理前端渲染和后端API)
- UI组件：Tailwind CSS
- API实现：Next.js API Routes (用于处理webhook和其他后端逻辑)
- 实时通信：SSE(与Next.js集成实现SSE功能)
- 数据存储：数据库如PostgreSQL(用于保存车辆状态、作业量等)
- 地图服务：简单的地图API如Leaflet.js

## 安全要求
- 简单的API密钥验证
- 基本的HTTPS通信保障

## 开发流程建议
1. **环境搭建**
   - 使用 `pnpm` 管理项目包依赖，不要使用 `npm` 或 `yarn`
   - 安装必要依赖：Tailwind CSS、PostgreSQL、SSE、leaflet等(如需)

2. **后端开发**
   - 在 `/pages/api` 下创建API路由处理webhook和车辆数据
   - 配置SSE服务实现推送车辆状态到客户端
   - 设置数据存储逻辑(PostgreSQL)

3. **前端开发**
   - 实现地图界面和车辆标记显示
   - 集成SSE客户端接收实时更新
   - 开发状态管理和展示组件

4. **测试与部署**
   - 使用Next.js内置开发服务器进行本地测试
   - 配置生产环境部署(Vercel或自托管服务器Docker环境)
   - 设置HTTPS和API密钥验证

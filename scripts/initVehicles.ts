// 确保加载环境变量
import { config } from 'dotenv';
config({ path: '.env' });

import { VehicleService } from '../lib/vehicleService';
import { setupDatabase } from '../db/database';

async function initVehicles() {
  console.log('开始初始化数据库和车辆数据...');
  
  try {
    // 初始化数据库表
    await setupDatabase();
    console.log('数据库表初始化完成!');
    
    // 初始化预设车辆数据（从 data/presetVehicles.json 文件加载）
    await VehicleService.initializePresetVehicles();
    
    console.log('车辆数据初始化完成!');
  } catch (error) {
    console.error('初始化过程中出现错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  initVehicles();
}
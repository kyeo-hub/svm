// 确保加载环境变量
import { config } from 'dotenv';
config({ path: '.env' });

import { setupDatabase } from '../db/database';

async function initDb() {
  console.log('开始初始化数据库...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');
  
  try {
    await setupDatabase();
    console.log('数据库初始化完成!');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  initDb();
}
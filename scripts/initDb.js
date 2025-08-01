// 确保加载环境变量
require('dotenv').config({ path: '.env' });

// 打印当前工作目录，帮助调试
console.log('当前工作目录:', process.cwd());

// 尝试加载数据库模块
let database;
try {
  database = require('../db/database.js');
  console.log('成功加载数据库模块');
} catch (error) {
  console.error('加载数据库模块失败:', error);
  process.exit(1);
}

const { setupDatabase } = database;

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

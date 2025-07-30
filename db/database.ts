import { Pool } from 'pg';

// 创建数据库连接池
export function initializeDatabase() {
  // 从环境变量获取数据库连接信息
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 环境变量未设置');
  }
  
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  return pool;
}

// 初始化数据库表
export async function setupDatabase() {
  let pool;
  
  try {
    pool = initializeDatabase();
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
  
  try {
    // 创建车辆表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        vehicle_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        location_x DOUBLE PRECISION,
        location_y DOUBLE PRECISION,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('vehicles 表创建成功或已存在');

    // 创建车辆状态历史表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_status_history (
        id SERIAL PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('vehicle_status_history 表创建成功或已存在');
    
    console.log('数据库表初始化完成');
  } catch (error) {
    console.error('数据库初始化错误:', error);
    throw error;
  } finally {
    await pool.end();
  }
}
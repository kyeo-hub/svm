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
    
    // 创建车辆状态段表（用于记录每次状态的开始和结束时间）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_status_segments (
        id SERIAL PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        status TEXT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        duration_seconds INTEGER DEFAULT 0
      )
    `);
    console.log('vehicle_status_segments 表创建成功或已存在');
    
    // 创建每日统计表（用于加速查询）
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_vehicle_stats (
        id SERIAL PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        date DATE NOT NULL,
        working_seconds INTEGER DEFAULT 0,
        waiting_seconds INTEGER DEFAULT 0,
        maintenance_seconds INTEGER DEFAULT 0,
        fault_seconds INTEGER DEFAULT 0,
        UNIQUE(vehicle_id, date)
      )
    `);
    console.log('daily_vehicle_stats 表创建成功或已存在');
    
    console.log('数据库表初始化完成');
  } catch (error) {
    console.error('数据库初始化错误:', error);
    throw error;
  } finally {
    await pool.end();
  }
}